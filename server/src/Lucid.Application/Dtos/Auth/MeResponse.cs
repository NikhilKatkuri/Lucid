using Lucid.Domain.Enums;

namespace Lucid.Application.Dtos.Auth;

public class MeResponse
{
    public UserDto User { get; set; } = new();
    public TenantContextDto? CurrentTenant { get; set; }
    public List<TenantSummaryDto> AvailableTenants { get; set; } = new();
}

public class TenantContextDto
{
    public string TenantId { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string TenantSlug { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public TenantRole Role { get; set; }
}

public class TenantSummaryDto
{
    public string TenantId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public TenantType Type { get; set; }
    public TenantRole Role { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
}
