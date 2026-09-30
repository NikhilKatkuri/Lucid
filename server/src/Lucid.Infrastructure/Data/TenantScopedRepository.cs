using Lucid.Application.Common.Interfaces;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Data;

/// <summary>
/// Base repository that enforces tenant scoping on all queries.
/// </summary>
public abstract class TenantScopedRepository<T> : ITenantScopedRepository<T> where T : class
{
    private readonly ITenantContext _tenantContext;

    protected TenantScopedRepository(ITenantContext tenantContext, IMongoCollection<T> collection)
    {
        _tenantContext = tenantContext;
        Collection = collection;
    }

    public IMongoCollection<T> Collection { get; }
    public string CurrentTenantId => _tenantContext.TenantId;

    public virtual async Task<T?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var filter = Builders<T>.Filter.Eq("_id", id) & Builders<T>.Filter.Eq("TenantId", CurrentTenantId);
        return await Collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public virtual async Task<List<T>> ListAsync(FilterDefinition<T> filter, CancellationToken ct = default)
    {
        var tenantFilter = Builders<T>.Filter.Eq("TenantId", CurrentTenantId) & filter;
        return await Collection.Find(tenantFilter).ToListAsync(ct);
    }

    public virtual async Task<long> CountAsync(FilterDefinition<T> filter, CancellationToken ct = default)
    {
        var tenantFilter = Builders<T>.Filter.Eq("TenantId", CurrentTenantId) & filter;
        return await Collection.CountDocumentsAsync(tenantFilter, cancellationToken: ct);
    }

    public virtual async Task<T> CreateAsync(T entity, CancellationToken ct = default)
    {
        await Collection.InsertOneAsync(entity, cancellationToken: ct);
        return entity;
    }

    public virtual async Task<bool> UpdateAsync(string id, UpdateDefinition<T> update, CancellationToken ct = default)
    {
        var filter = Builders<T>.Filter.Eq("_id", id) & Builders<T>.Filter.Eq("TenantId", CurrentTenantId);
        var result = await Collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public virtual async Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        var filter = Builders<T>.Filter.Eq("_id", id) & Builders<T>.Filter.Eq("TenantId", CurrentTenantId);
        var result = await Collection.DeleteOneAsync(filter, ct);
        return result.DeletedCount > 0;
    }
}
