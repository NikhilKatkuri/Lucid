using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

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
        // This endpoint performs a genuine authorization attempt
        // It does NOT bypass real security controls

        var targetTenant = await _dbContext.GetCollection<Domain.Entities.Tenant>("tenants")
            .Find(t => t.Id == request.TargetTenantId).FirstOrDefaultAsync(ct);

        if (targetTenant == null)
        {
            await _auditService.RecordAsync(AuditAction.CrossTenantAttempt, "Tenant", request.TargetTenantId, AuditResult.Blocked, "Target tenant not found", ct);
            return Ok(ApiResponse<object>.Ok(new { blocked = true, status = 404, reason = "Target tenant not found" }));
        }

        var membership = await _dbContext.GetCollection<Domain.Entities.TenantMembership>("tenantMemberships")
            .Find(m => m.TenantId == request.TargetTenantId && m.UserId == _tenantContext.UserId).FirstOrDefaultAsync(ct);

        if (membership == null)
        {
            await _auditService.RecordAsync(AuditAction.CrossTenantAttempt, "Tenant", request.TargetTenantId, AuditResult.Blocked, "User is not authorized for target tenant", ct);
            return Ok(ApiResponse<object>.Ok(new { blocked = true, status = 403, reason = "User is not authorized for target tenant" }));
        }

        await _auditService.RecordAsync(AuditAction.CrossTenantAttempt, "Tenant", request.TargetTenantId, AuditResult.Success, "User has access to target tenant", ct);
        return Ok(ApiResponse<object>.Ok(new { blocked = false, status = 200, reason = "User has access to target tenant" }));
    }
}

public class SimulateCrossTenantRequest
{
    public string TargetTenantId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
}
