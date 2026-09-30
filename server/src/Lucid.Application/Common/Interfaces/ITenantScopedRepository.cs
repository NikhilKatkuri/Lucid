using MongoDB.Driver;

namespace Lucid.Application.Common.Interfaces;

/// <summary>
/// Base interface for tenant-scoped repositories.
/// All queries MUST include TenantId filter.
/// </summary>
public interface ITenantScopedRepository<T> where T : class
{
    IMongoCollection<T> Collection { get; }
    string CurrentTenantId { get; }

    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<List<T>> ListAsync(FilterDefinition<T> filter, CancellationToken ct = default);
    Task<long> CountAsync(FilterDefinition<T> filter, CancellationToken ct = default);
    Task<T> CreateAsync(T entity, CancellationToken ct = default);
    Task<bool> UpdateAsync(string id, UpdateDefinition<T> update, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}
