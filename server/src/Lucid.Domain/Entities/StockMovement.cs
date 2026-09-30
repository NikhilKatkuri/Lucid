using Lucid.Domain.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Lucid.Domain.Entities;

/// <summary>
/// Append-only stock movement record. Never update or delete.
/// </summary>
public class StockMovement
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("productId")]
    public string ProductId { get; set; } = string.Empty;

    [BsonElement("type")]
    public StockMovementType Type { get; set; } = StockMovementType.Adjustment;

    [BsonElement("quantityDelta")]
    public int QuantityDelta { get; set; } = 0;

    [BsonElement("beforeQuantity")]
    public int BeforeQuantity { get; set; } = 0;

    [BsonElement("afterQuantity")]
    public int AfterQuantity { get; set; } = 0;

    [BsonElement("reason")]
    public string Reason { get; set; } = string.Empty;

    [BsonElement("referenceId")]
    [BsonIgnoreIfNull]
    public string? ReferenceId { get; set; }

    [BsonElement("performedByUserId")]
    public string PerformedByUserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
