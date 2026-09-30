namespace Lucid.Application.Dtos.Files;

public class PresignResponse
{
    public string UploadUrl { get; set; } = string.Empty;
    public Dictionary<string, string> Fields { get; set; } = new();
    public string FileId { get; set; } = string.Empty;
    public string S3Key { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
