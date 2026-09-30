using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Files;

public class PresignUploadRequest
{
    [Required, MaxLength(200)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    [Range(0, long.MaxValue)]
    public long Size { get; set; }

    [Required, MaxLength(100)]
    public string EntityId { get; set; } = string.Empty;
}
