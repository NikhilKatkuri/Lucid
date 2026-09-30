using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Enums;

namespace Lucid.Infrastructure.Services;

/// <summary>
/// Request-scoped tenant context. Populated by TenantResolutionMiddleware
/// after authenticating the user and verifying membership.
/// </summary>
public class TenantContext : ITenantContext
{
    public string TenantId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public TenantRole Role { get; set; } = TenantRole.Viewer;
    public bool IsAuthenticated => !string.IsNullOrEmpty(UserId);
}
