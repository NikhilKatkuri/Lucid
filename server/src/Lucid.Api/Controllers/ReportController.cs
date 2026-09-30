using Lucid.Api.Authorization;
using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Lucid.Infrastructure.Data;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using MongoDB.Driver;

namespace Lucid.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public ReportController(IReportService reportService, MongoDbContext dbContext, ITenantContext tenantContext)
    {
        _reportService = reportService;
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet("dashboard")]
    [AuthorizePermission(Permission.ReportRead)]
    public async Task<ActionResult<ApiResponse<DashboardResponse>>> GetDashboard(CancellationToken ct)
    {
        var result = await _reportService.GetDashboardAsync(ct);
        return Ok(ApiResponse<DashboardResponse>.Ok(result));
    }

    [HttpGet("organization")]
    public async Task<ActionResult<ApiResponse<OrganizationDashboardResponse>>> GetOrganizationDashboard(CancellationToken ct)
    {
        var admin = await _dbContext.GetCollection<OrganizationMembership>("organizationMemberships")
            .Find(m => m.OrganizationId == _tenantContext.OrganizationId && m.UserId == _tenantContext.UserId && m.Role == OrganizationRole.OrgAdmin)
            .AnyAsync(ct);
        if (!admin) return Forbid();
        var result = await _reportService.GetOrganizationDashboardAsync(ct);
        return Ok(ApiResponse<OrganizationDashboardResponse>.Ok(result));
    }
}
