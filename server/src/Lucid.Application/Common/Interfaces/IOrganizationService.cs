using Lucid.Domain.Entities;

namespace Lucid.Application.Common.Interfaces;

public interface IOrganizationService
{
    Task<Organization?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Organization> CreateAsync(string name, string slug, string ownerUserId, CancellationToken ct = default);
    Task<List<Organization>> GetByUserAsync(string userId, CancellationToken ct = default);
}
