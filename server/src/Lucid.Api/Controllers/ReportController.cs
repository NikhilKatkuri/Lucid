using Lucid.Api.Authorization;
using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Reports;
using Lucid.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lucid.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("dashboard")]
    [AuthorizePermission(Permission.ReportRead)]
    public async Task<ActionResult<ApiResponse<DashboardResponse>>> GetDashboard(CancellationToken ct)
    {
        var result = await _reportService.GetDashboardAsync(ct);
        return Ok(ApiResponse<DashboardResponse>.Ok(result));
    }

    [HttpGet("organization")]
    [AuthorizePermission(Permission.OrganizationReport)]
    public async Task<ActionResult<ApiResponse<OrganizationDashboardResponse>>> GetOrganizationDashboard(CancellationToken ct)
    {
        var result = await _reportService.GetOrganizationDashboardAsync(ct);
        return Ok(ApiResponse<OrganizationDashboardResponse>.Ok(result));
    }
}
