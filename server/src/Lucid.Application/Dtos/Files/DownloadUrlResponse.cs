namespace Lucid.Application.Dtos.Files;

public class DownloadUrlResponse
{
    public string DownloadUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
