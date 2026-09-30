using Lucid.Domain.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Lucid.Domain.Entities;

public class TenantFile
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("entityId")]
    public string EntityId { get; set; } = string.Empty;

    [BsonElement("s3Key")]
    public string S3Key { get; set; } = string.Empty;

    [BsonElement("fileName")]
    public string FileName { get; set; } = string.Empty;

    [BsonElement("contentType")]
    public string ContentType { get; set; } = string.Empty;

    [BsonElement("size")]
    public long Size { get; set; } = 0;

    [BsonElement("status")]
    public FileStatus Status { get; set; } = FileStatus.Pending;

    [BsonElement("createdByUserId")]
    public string CreatedByUserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
