namespace Lucid.Application.Dtos.Reports;

public class OrganizationDashboardResponse
{
    public int TotalProducts { get; set; }
    public int TotalStock { get; set; }
    public int LowStockProducts { get; set; }
    public int OutOfStockProducts { get; set; }
    public decimal InventoryValue { get; set; }
    public List<TenantSummary> Tenants { get; set; } = new();
}

public class TenantSummary
{
    public string TenantId { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public int TotalProducts { get; set; }
    public int TotalStock { get; set; }
    public int LowStockProducts { get; set; }
    public int OutOfStockProducts { get; set; }
    public decimal InventoryValue { get; set; }
}
