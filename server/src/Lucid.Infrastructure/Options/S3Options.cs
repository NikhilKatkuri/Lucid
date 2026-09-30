namespace Lucid.Infrastructure.Options;

public class S3Options
{
    public const string SectionName = "S3";

    public string Bucket { get; set; } = "lucid-files";
    public string Region { get; set; } = "us-east-1";
    public string? Endpoint { get; set; }
    public string? PublicEndpoint { get; set; }
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public long MaxImageBytes { get; set; } = 2 * 1024 * 1024;
}
