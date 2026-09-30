namespace Lucid.Infrastructure.Options;

public class TenantOptions
{
    public const string SectionName = "Tenant";

    public string BaseDomain { get; set; } = "lucid.app";
    public List<string> ReservedSubdomains { get; set; } = new() { "www", "api", "admin", "app", "mail", "ftp", "localhost" };
}
