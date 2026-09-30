using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Lucid.Domain.Entities;

namespace Lucid.Api.Controllers;

[ApiController]
[Route("api/v1/security")]
[Authorize]
public class SecurityController : ControllerBase
{
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;

    public SecurityController(MongoDbContext dbContext, ITenantContext tenantContext, IAuditService auditService)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _auditService = auditService;
    }

    [HttpGet("events")]
    public async Task<ActionResult<ApiResponse<PagedResult<Domain.Entities.AuditEvent>>>> GetSecurityEvents(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        [FromQuery] bool orgWide = false, CancellationToken ct = default)
    {
        if (page < 1 || pageSize < 1 || pageSize > 100)
            return BadRequest(ApiResponse<object>.Fail("page must be positive and pageSize must be between 1 and 100"));
        if (_tenantContext.Role != TenantRole.Manager && !await IsOrgAdminAsync(ct)) return Forbid();
        if (orgWide && !await IsOrgAdminAsync(ct)) return Forbid();
        var collection = _dbContext.GetCollection<Domain.Entities.AuditEvent>("auditEvents");

        // orgWide surfaces attempts against sibling tenants in the same org,
        // which is what the security dashboard needs to show.
        var filter = orgWide
            ? Builders<Domain.Entities.AuditEvent>.Filter.Eq(e => e.OrganizationId, _tenantContext.OrganizationId)
            : Builders<Domain.Entities.AuditEvent>.Filter.Eq(e => e.TenantId, _tenantContext.TenantId);

        var total = await collection.CountDocumentsAsync(filter, cancellationToken: ct);
        var items = await collection.Find(filter)
            .SortByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(ct);

        var result = PagedResult<Domain.Entities.AuditEvent>.Create(items, page, pageSize, (int)total);
        return Ok(new ApiResponse<PagedResult<Domain.Entities.AuditEvent>>
        {
            Success = true,
            Message = "Security events retrieved",
            Data = result,
            Pagination = new PaginationInfo { Page = result.Page, PageSize = result.PageSize, Total = result.Total }
        });
    }

    [HttpPost("simulations/cross-tenant")]
    public async Task<ActionResult<ApiResponse<object>>> SimulateCrossTenant([FromBody] SimulateCrossTenantRequest request, CancellationToken ct)
    {
        if (_tenantContext.Role != TenantRole.Manager && !await IsOrgAdminAsync(ct)) return Forbid();
        // Report a simulated access decision without exposing tenant existence.

        var targetTenant = await _dbContext.GetCollection<Domain.Entities.Tenant>("tenants")
            .Find(t => t.Id == request.TargetTenantId).FirstOrDefaultAsync(ct);

        var isOrgAdmin = await IsOrgAdminAsync(ct);
        if (targetTenant == null || (targetTenant.OrganizationId != _tenantContext.OrganizationId && !isOrgAdmin))
        {
            await _auditService.RecordAsync(AuditAction.CrossTenantAttempt, "Tenant", request.TargetTenantId, AuditResult.Blocked, "Target unavailable", ct);
            return Ok(ApiResponse<object>.Ok(new { blocked = true, status = 403, reason = "Access denied" }));
        }

        var membership = await _dbContext.GetCollection<Domain.Entities.TenantMembership>("tenantMemberships")
            .Find(m => m.TenantId == request.TargetTenantId && m.UserId == _tenantContext.UserId).FirstOrDefaultAsync(ct);

        if (membership == null)
        {
            await _auditService.RecordAsync(AuditAction.CrossTenantAttempt, "Tenant", request.TargetTenantId, AuditResult.Blocked, "User is not authorized for target tenant", ct);
            return Ok(ApiResponse<object>.Ok(new { blocked = true, status = 403, reason = "Access denied" }));
        }

        await _auditService.RecordAsync(AuditAction.CrossTenantAttempt, "Tenant", request.TargetTenantId, AuditResult.Success, "User has access to target tenant", ct);
        return Ok(ApiResponse<object>.Ok(new { blocked = false, status = 200, reason = "User has access to target tenant" }));
    }

    private Task<bool> IsOrgAdminAsync(CancellationToken ct) => _dbContext.GetCollection<OrganizationMembership>("organizationMemberships")
        .Find(m => m.OrganizationId == _tenantContext.OrganizationId && m.UserId == _tenantContext.UserId && m.Role == OrganizationRole.OrgAdmin)
        .AnyAsync(ct);
}

public class SimulateCrossTenantRequest
{
    public string TargetTenantId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
}
