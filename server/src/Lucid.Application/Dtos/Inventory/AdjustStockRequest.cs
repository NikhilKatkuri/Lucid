using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Inventory;

public class AdjustStockRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int QuantityDelta { get; set; }

    [Required, MaxLength(200)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Note { get; set; }
}
