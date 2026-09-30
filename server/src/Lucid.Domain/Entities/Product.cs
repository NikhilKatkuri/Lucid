using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Lucid.Domain.Entities;

public class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("sku")]
    public string Sku { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("quantity")]
    public int Quantity { get; set; } = 0;

    [BsonElement("reorderLevel")]
    public int ReorderLevel { get; set; } = 0;

    [BsonElement("price")]
    public decimal Price { get; set; } = 0;

    [BsonElement("imageKey")]
    [BsonIgnoreIfNull]
    public string? ImageKey { get; set; }

    [BsonElement("version")]
    public int Version { get; set; } = 0;

    [BsonElement("isArchived")]
    public bool IsArchived { get; set; } = false;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
