using Lucid.Application.Dtos.Reports;

namespace Lucid.Application.Common.Interfaces;

public interface IReportService
{
    Task<DashboardResponse> GetDashboardAsync(CancellationToken ct = default);
    Task<OrganizationDashboardResponse> GetOrganizationDashboardAsync(CancellationToken ct = default);
}
