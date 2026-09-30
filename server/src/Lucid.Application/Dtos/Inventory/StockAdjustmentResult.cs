namespace Lucid.Application.Dtos.Inventory;

public class StockAdjustmentResult
{
    public string ProductId { get; set; } = string.Empty;
    public int BeforeQuantity { get; set; }
    public int AfterQuantity { get; set; }
    public int Delta { get; set; }
    public string MovementId { get; set; } = string.Empty;
}
