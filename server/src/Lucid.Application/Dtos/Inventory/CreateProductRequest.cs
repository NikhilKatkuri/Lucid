using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Inventory;

public class CreateProductRequest
{
    [Required, MaxLength(50)]
    public string Sku { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int Quantity { get; set; } = 0;

    [Range(0, int.MaxValue)]
    public int ReorderLevel { get; set; } = 0;

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; } = 0;
}
