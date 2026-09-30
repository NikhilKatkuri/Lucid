using Lucid.Domain.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Lucid.Domain.Entities;

/// <summary>
/// Append-only audit event. Never update or delete.
/// </summary>
public class AuditEvent
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("organizationId")]
    public string OrganizationId { get; set; } = string.Empty;

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("action")]
    public AuditAction Action { get; set; }

    [BsonElement("resourceType")]
    public string ResourceType { get; set; } = string.Empty;

    [BsonElement("resourceId")]
    [BsonIgnoreIfNull]
    public string? ResourceId { get; set; }

    [BsonElement("result")]
    public AuditResult Result { get; set; } = AuditResult.Success;

    [BsonElement("reason")]
    [BsonIgnoreIfNull]
    public string? Reason { get; set; }

    [BsonElement("ipAddress")]
    [BsonIgnoreIfNull]
    public string? IpAddress { get; set; }

    [BsonElement("userAgent")]
    [BsonIgnoreIfNull]
    public string? UserAgent { get; set; }

    [BsonElement("requestId")]
    [BsonIgnoreIfNull]
    public string? RequestId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
