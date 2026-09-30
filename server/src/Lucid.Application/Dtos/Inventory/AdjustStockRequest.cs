using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Inventory;

public class AdjustStockRequest : IValidatableObject
{
    [Required]
    [Range(int.MinValue, int.MaxValue)]
    public int QuantityDelta { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (QuantityDelta == 0)
            yield return new ValidationResult("QuantityDelta must not be zero", new[] { nameof(QuantityDelta) });
        if (QuantityDelta == int.MinValue)
            yield return new ValidationResult("QuantityDelta is outside the supported range", new[] { nameof(QuantityDelta) });
    }

    [Required, MaxLength(200)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Note { get; set; }
}
