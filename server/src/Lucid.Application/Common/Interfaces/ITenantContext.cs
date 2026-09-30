using Lucid.Domain.Enums;

namespace Lucid.Application.Common.Interfaces;

public interface ITenantContext
{
    string TenantId { get; }
    string OrganizationId { get; }
    string UserId { get; }
    TenantRole Role { get; }
    bool IsAuthenticated { get; }
}
