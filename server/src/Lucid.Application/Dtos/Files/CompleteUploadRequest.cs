using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Files;

public class CompleteUploadRequest
{
    [Required]
    public string FileId { get; set; } = string.Empty;
}
