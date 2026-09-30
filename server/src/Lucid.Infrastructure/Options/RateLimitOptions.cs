namespace Lucid.Infrastructure.Options;

public class RateLimitOptions
{
    public const string SectionName = "RateLimit";

    public int DefaultLimit { get; set; } = 100;
    public int DefaultWindowSeconds { get; set; } = 60;
    public int AuthLimit { get; set; } = 5;
    public int AuthWindowSeconds { get; set; } = 60;
    public int UploadLimit { get; set; } = 10;
    public int UploadWindowSeconds { get; set; } = 60;
}
