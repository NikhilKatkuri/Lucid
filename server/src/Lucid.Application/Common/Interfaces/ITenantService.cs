using Lucid.Domain.Entities;
using Lucid.Domain.Enums;

namespace Lucid.Application.Common.Interfaces;

public interface ITenantService
{
    Task<Tenant?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Tenant?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<Tenant> CreateAsync(string organizationId, string name, string slug, TenantType type, CancellationToken ct = default);
    Task<List<Tenant>> GetByOrganizationAsync(string organizationId, CancellationToken ct = default);
    Task<List<Tenant>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task<bool> HasMembershipAsync(string tenantId, string userId, CancellationToken ct = default);
    Task<TenantMembership?> GetMembershipAsync(string tenantId, string userId, CancellationToken ct = default);
}
