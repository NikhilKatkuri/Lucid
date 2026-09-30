using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Entities;
using Lucid.Infrastructure.Data;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class OrganizationService : IOrganizationService
{
    private readonly MongoDbContext _dbContext;

    public OrganizationService(MongoDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Organization?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Organization>("organizations");
        return await collection.Find(o => o.Id == id).FirstOrDefaultAsync(ct);
    }

    public async Task<Organization> CreateAsync(string name, string slug, string ownerUserId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Organization>("organizations");

        var existing = await collection.Find(o => o.Slug == slug).FirstOrDefaultAsync(ct);
        if (existing != null)
            throw new InvalidOperationException("Organization with this slug already exists");

        var org = new Organization
        {
            Name = name,
            Slug = slug,
            OwnerUserId = ownerUserId,
            Plan = "free"
        };

        await collection.InsertOneAsync(org, cancellationToken: ct);

        // Create owner membership
        var membershipCollection = _dbContext.GetCollection<OrganizationMembership>("organizationMemberships");
        await membershipCollection.InsertOneAsync(new OrganizationMembership
        {
            OrganizationId = org.Id,
            UserId = ownerUserId,
            Role = Domain.Enums.OrganizationRole.OrgAdmin
        }, cancellationToken: ct);

        return org;
    }

    public async Task<List<Organization>> GetByUserAsync(string userId, CancellationToken ct = default)
    {
        var membershipCollection = _dbContext.GetCollection<OrganizationMembership>("organizationMemberships");
        var memberships = await membershipCollection.Find(m => m.UserId == userId).ToListAsync(ct);

        var orgIds = memberships.Select(m => m.OrganizationId).ToList();
        if (!orgIds.Any())
            return new List<Organization>();

        var collection = _dbContext.GetCollection<Organization>("organizations");
        return await collection.Find(o => orgIds.Contains(o.Id)).ToListAsync(ct);
    }
}
