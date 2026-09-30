using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class TenantService : ITenantService
{
    private readonly MongoDbContext _dbContext;

    public TenantService(MongoDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Tenant?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Tenant>("tenants");
        return await collection.Find(t => t.Id == id && t.IsActive).FirstOrDefaultAsync(ct);
    }

    public async Task<Tenant?> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Tenant>("tenants");
        return await collection.Find(t => t.Slug == slug && t.IsActive).FirstOrDefaultAsync(ct);
    }

    public async Task<Tenant> CreateAsync(string organizationId, string name, string slug, TenantType type, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Tenant>("tenants");

        var existing = await collection.Find(t => t.OrganizationId == organizationId && t.Slug == slug).FirstOrDefaultAsync(ct);
        if (existing != null)
            throw new InvalidOperationException("Tenant with this slug already exists in the organization");

        var tenant = new Tenant
        {
            OrganizationId = organizationId,
            Name = name,
            Slug = slug,
            Type = type,
            IsActive = true
        };

        await collection.InsertOneAsync(tenant, cancellationToken: ct);
        return tenant;
    }

    public async Task<List<Tenant>> GetByOrganizationAsync(string organizationId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Tenant>("tenants");
        return await collection.Find(t => t.OrganizationId == organizationId && t.IsActive).ToListAsync(ct);
    }

    public async Task<List<Tenant>> GetByUserAsync(string userId, CancellationToken ct = default)
    {
        var membershipCollection = _dbContext.GetCollection<TenantMembership>("tenantMemberships");
        var memberships = await membershipCollection.Find(m => m.UserId == userId).ToListAsync(ct);

        var tenantIds = memberships.Select(m => m.TenantId).ToList();
        if (!tenantIds.Any())
            return new List<Tenant>();

        var collection = _dbContext.GetCollection<Tenant>("tenants");
        return await collection.Find(t => tenantIds.Contains(t.Id) && t.IsActive).ToListAsync(ct);
    }

    public async Task<bool> HasMembershipAsync(string tenantId, string userId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantMembership>("tenantMemberships");
        var count = await collection.CountDocumentsAsync(m => m.TenantId == tenantId && m.UserId == userId, cancellationToken: ct);
        return count > 0;
    }

    public async Task<TenantMembership?> GetMembershipAsync(string tenantId, string userId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantMembership>("tenantMemberships");
        return await collection.Find(m => m.TenantId == tenantId && m.UserId == userId).FirstOrDefaultAsync(ct);
    }
}
