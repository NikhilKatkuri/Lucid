using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Lucid.Api.Controllers;

/// <summary>
/// Development/demo helper: creates an additional tenant inside the caller's
/// own organization and grants the caller membership, so tenant switching and
/// cross-tenant isolation can be demonstrated without manual DB seeding.
///
/// Must NOT be exposed in production.
/// </summary>
[ApiController]
[Route("api/v1/dev")]
[Authorize]
public class DevController : ControllerBase
{
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public DevController(MongoDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// Create a sibling tenant in the same organization and make the caller a Manager.
    /// </summary>
    [HttpPost("tenants")]
    public async Task<ActionResult<ApiResponse<object>>> CreateSiblingTenant(
        [FromBody] CreateSiblingTenantRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Slug))
            return BadRequest(ApiResponse<object>.Fail("name and slug are required"));

        var tenantCollection = _dbContext.GetCollection<Tenant>("tenants");

        var slug = request.Slug.ToLowerInvariant();
        var existing = await tenantCollection
            .Find(t => t.OrganizationId == _tenantContext.OrganizationId && t.Slug == slug)
            .FirstOrDefaultAsync(ct);

        if (existing != null)
            return Conflict(ApiResponse<object>.Fail("Tenant with this slug already exists in the organization"));

        var tenant = new Tenant
        {
            OrganizationId = _tenantContext.OrganizationId,
            ParentTenantId = null, // depth 1 only: organization -> tenant
            Name = request.Name,
            Slug = slug,
            Type = Enum.TryParse<TenantType>(request.Type, true, out var type) ? type : TenantType.Store,
            IsActive = true
        };

        await tenantCollection.InsertOneAsync(tenant, cancellationToken: ct);

        // grant the caller membership so they can switch to it
        var membershipCollection = _dbContext.GetCollection<TenantMembership>("tenantMemberships");
        await membershipCollection.InsertOneAsync(new TenantMembership
        {
            TenantId = tenant.Id,
            UserId = _tenantContext.UserId,
            Role = TenantRole.Manager
        }, cancellationToken: ct);

        return Ok(ApiResponse<object>.Ok(new
        {
            tenantId = tenant.Id,
            name = tenant.Name,
            slug = tenant.Slug,
            type = tenant.Type.ToString()
        }, "Tenant created"));
    }
}

public class CreateSiblingTenantRequest
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Type { get; set; } = "Store";
}
