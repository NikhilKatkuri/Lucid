namespace Lucid.Application.Dtos.Reports;

public class DashboardResponse
{
    public int TotalProducts { get; set; }
    public int TotalStock { get; set; }
    public int LowStockProducts { get; set; }
    public int OutOfStockProducts { get; set; }
    public decimal InventoryValue { get; set; }
    public List<LowStockItem> LowStockItems { get; set; } = new();
    public List<RecentMovement> RecentMovements { get; set; } = new();
}

public class LowStockItem
{
    public string ProductId { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int ReorderLevel { get; set; }
}

public class RecentMovement
{
    public string MovementId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int QuantityDelta { get; set; }
    public int AfterQuantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
