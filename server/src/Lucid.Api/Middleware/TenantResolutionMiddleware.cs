using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Lucid.Infrastructure.Options;
using Lucid.Infrastructure.Services;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Security.Claims;

namespace Lucid.Api.Middleware;

/// <summary>
/// Resolves the active tenant for the request and populates ITenantContext.
/// Order of resolution:
///   1. Subdomain of the request host  (production: acme.lucid.app)
///   2. X-Tenant-ID header              (development / API testing only)
///
/// The header NEVER grants access on its own: membership is always verified,
/// so a forged header results in 403, not data.
/// </summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly MongoDbContext _dbContext;
    private readonly TenantOptions _options;

    public TenantResolutionMiddleware(
        RequestDelegate next,
        MongoDbContext dbContext,
        IOptions<TenantOptions> options)
    {
        _next = next;
        _dbContext = dbContext;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Endpoints that must work before a tenant exists
        if (path.StartsWith("/health") ||
            path.StartsWith("/swagger") ||
            path.StartsWith("/api/v1/auth"))
        {
            await _next(context);
            return;
        }

        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? context.User.FindFirst("sub")?.Value;

        // Authenticated endpoints require a user
        if (string.IsNullOrEmpty(userId))
        {
            await WriteAsync(context, StatusCodes.Status401Unauthorized,
                "Authentication required. Send header 'Authorization: Bearer <accessToken>' " +
                "(without the word Bearer in Swagger's Authorize field). " +
                "Get a token from POST /api/v1/auth/signin.");
            return;
        }

        var requested = ResolveRequestedTenant(context);

        // No tenant could be determined at all -> 404
        if (string.IsNullOrEmpty(requested))
        {
            await WriteAsync(context, StatusCodes.Status404NotFound,
                "Tenant could not be resolved. On localhost there is no subdomain, " +
                "so send header 'X-Tenant-ID: <tenantId>'. " +
                "Read your tenantId from GET /api/v1/auth/me -> data.currentTenant.tenantId.");
            return;
        }

        var tenant = await ResolveTenantAsync(requested);
        if (tenant == null)
        {
            await WriteAsync(context, StatusCodes.Status404NotFound,
                $"Tenant '{requested}' not found. Check the 'X-Tenant-ID' value or the subdomain in the host.");
            return;
        }

        // An explicit X-Tenant-ID naming a real tenant that the caller is not a
        // member of is a cross-tenant attempt, not a missing resource -> 403.

        // Membership is mandatory. Known tenant but no membership -> 403.
        var membershipCollection = _dbContext.GetCollection<TenantMembership>("tenantMemberships");
        var membership = await membershipCollection
            .Find(m => m.TenantId == tenant.Id && m.UserId == userId)
            .FirstOrDefaultAsync();

        if (membership == null)
        {
            // Record the blocked cross-tenant attempt before responding.
            await RecordCrossTenantAttemptAsync(context, userId, tenant);
            await WriteAsync(context, StatusCodes.Status403Forbidden, "Access denied");
            return;
        }

        if (tenantContext is TenantContext scoped)
        {
            scoped.TenantId = tenant.Id;
            scoped.OrganizationId = tenant.OrganizationId;
            scoped.UserId = userId;
            scoped.Role = membership.Role;
        }

        await _next(context);
    }

    /// <summary>
    /// Returns the raw tenant identifier requested by the client:
    /// either a slug (from the subdomain) or a tenant id (from the header).
    /// </summary>
    private string? ResolveRequestedTenant(HttpContext context)
    {
        var headerTenantId = context.Request.Headers["X-Tenant-ID"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(headerTenantId))
            return headerTenantId.Trim();

        var host = context.Request.Host.Host;
        if (string.IsNullOrWhiteSpace(host))
            return null;

        if (!host.EndsWith(_options.BaseDomain, StringComparison.OrdinalIgnoreCase))
            return null;

        var parts = host.Split('.');
        if (parts.Length < 3)
            return null;

        var subdomain = parts[0].ToLowerInvariant();
        if (_options.ReservedSubdomains.Contains(subdomain))
            return null;

        return subdomain;
    }

    private async Task<Tenant?> ResolveTenantAsync(string requested)
    {
        var collection = _dbContext.GetCollection<Tenant>("tenants");

        // Subdomain form
        var bySlug = await collection
            .Find(t => t.Slug == requested && t.IsActive)
            .FirstOrDefaultAsync();

        if (bySlug != null)
            return bySlug;

        // X-Tenant-ID form (guid)
        if (Guid.TryParse(requested, out var guid))
        {
            return await collection
                .Find(t => t.Id == guid.ToString() && t.IsActive)
                .FirstOrDefaultAsync();
        }

        return null;
    }

    private async Task RecordCrossTenantAttemptAsync(HttpContext context, string userId, Tenant targetTenant)
    {
        try
        {
            var audit = _dbContext.GetCollection<AuditEvent>("auditEvents");
            await audit.InsertOneAsync(new AuditEvent
            {
                OrganizationId = targetTenant.OrganizationId,
                TenantId = targetTenant.Id,
                UserId = userId,
                Action = AuditAction.CrossTenantAttempt,
                ResourceType = "Tenant",
                ResourceId = targetTenant.Id,
                Result = AuditResult.Blocked,
                Reason = "User is not a member of the requested tenant",
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers["User-Agent"].ToString(),
                RequestId = context.TraceIdentifier
            });
        }
        catch
        {
            // Never let audit failure change the security outcome.
        }
    }

    private static Task WriteAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsJsonAsync(new
        {
            success = false,
            message,
            errors = Array.Empty<object>()
        });
    }
}
