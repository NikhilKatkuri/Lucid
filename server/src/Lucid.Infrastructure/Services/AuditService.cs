using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(MongoDbContext dbContext, ITenantContext tenantContext, IHttpContextAccessor httpContextAccessor)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task RecordAsync(AuditAction action, string resourceType, string? resourceId, AuditResult result, string? reason = null, CancellationToken ct = default)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        var auditEvent = new AuditEvent
        {
            OrganizationId = _tenantContext.OrganizationId,
            TenantId = _tenantContext.TenantId,
            UserId = _tenantContext.UserId,
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Result = result,
            Reason = reason,
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
            RequestId = httpContext?.TraceIdentifier
        };

        var collection = _dbContext.GetCollection<AuditEvent>("auditEvents");
        await collection.InsertOneAsync(auditEvent, cancellationToken: ct);
    }
}
