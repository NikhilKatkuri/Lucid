using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Lucid.Domain.Entities;

/// <summary>
/// A revoked JWT (by jti) so it cannot be replayed after logout.
/// </summary>
public class RevokedToken
{
    [BsonId]
    public string Jti { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [BsonElement("revokedAt")]
    public DateTime RevokedAt { get; set; } = DateTime.UtcNow;
}
