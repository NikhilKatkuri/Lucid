using MongoDB.Driver;
using Lucid.Infrastructure.Options;
using Microsoft.Extensions.Options;

namespace Lucid.Infrastructure.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;
    private readonly IMongoClient _client;
    private readonly MongoDbOptions _options;

    public MongoDbContext(IOptions<MongoDbOptions> options)
    {
        _options = options.Value;
        _client = new MongoClient(_options.ConnectionString);
        _database = _client.GetDatabase(_options.DatabaseName);
    }

    public IMongoCollection<T> GetCollection<T>(string name) => _database.GetCollection<T>(name);

    public IMongoDatabase Database => _database;
    public IMongoClient Client => _client;

    public async Task CreateIndexesAsync()
    {
        // User indexes
        var userCollection = GetCollection<Domain.Entities.User>("users");
        var userIndexKeys = Builders<Domain.Entities.User>.IndexKeys.Ascending(u => u.Email);
        await userCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.User>(userIndexKeys, new CreateIndexOptions { Unique = true }));

        // Organization indexes
        var orgCollection = GetCollection<Domain.Entities.Organization>("organizations");
        var orgSlugKeys = Builders<Domain.Entities.Organization>.IndexKeys.Ascending(o => o.Slug);
        await orgCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Organization>(orgSlugKeys, new CreateIndexOptions { Unique = true }));

        // Tenant indexes
        var tenantCollection = GetCollection<Domain.Entities.Tenant>("tenants");
        var tenantOrgSlugKeys = Builders<Domain.Entities.Tenant>.IndexKeys.Ascending(t => t.OrganizationId).Ascending(t => t.Slug);
        await tenantCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Tenant>(tenantOrgSlugKeys, new CreateIndexOptions { Unique = true }));
        var tenantOrgKeys = Builders<Domain.Entities.Tenant>.IndexKeys.Ascending(t => t.OrganizationId);
        await tenantCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Tenant>(tenantOrgKeys));

        // TenantMembership indexes
        var tenantMemCollection = GetCollection<Domain.Entities.TenantMembership>("tenantMemberships");
        var tenantMemKeys = Builders<Domain.Entities.TenantMembership>.IndexKeys.Ascending(tm => tm.TenantId).Ascending(tm => tm.UserId);
        await tenantMemCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.TenantMembership>(tenantMemKeys, new CreateIndexOptions { Unique = true }));
        var tenantMemUserKeys = Builders<Domain.Entities.TenantMembership>.IndexKeys.Ascending(tm => tm.UserId).Ascending(tm => tm.TenantId);
        await tenantMemCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.TenantMembership>(tenantMemUserKeys));

        // OrganizationMembership indexes
        var orgMemCollection = GetCollection<Domain.Entities.OrganizationMembership>("organizationMemberships");
        var orgMemKeys = Builders<Domain.Entities.OrganizationMembership>.IndexKeys.Ascending(om => om.OrganizationId).Ascending(om => om.UserId);
        await orgMemCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.OrganizationMembership>(orgMemKeys, new CreateIndexOptions { Unique = true }));

        // Product indexes
        var productCollection = GetCollection<Domain.Entities.Product>("products");
        var productSkuKeys = Builders<Domain.Entities.Product>.IndexKeys.Ascending(p => p.TenantId).Ascending(p => p.Sku);
        await productCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Product>(productSkuKeys, new CreateIndexOptions { Unique = true }));
        var productNameKeys = Builders<Domain.Entities.Product>.IndexKeys.Ascending(p => p.TenantId).Ascending(p => p.Name);
        await productCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Product>(productNameKeys));
        var productArchivedKeys = Builders<Domain.Entities.Product>.IndexKeys.Ascending(p => p.TenantId).Ascending(p => p.IsArchived);
        await productCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Product>(productArchivedKeys));
        var productUpdatedKeys = Builders<Domain.Entities.Product>.IndexKeys.Ascending(p => p.TenantId).Ascending(p => p.UpdatedAt);
        await productCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.Product>(productUpdatedKeys));

        // StockMovement indexes
        var stockCollection = GetCollection<Domain.Entities.StockMovement>("stockMovements");
        var stockProductKeys = Builders<Domain.Entities.StockMovement>.IndexKeys.Ascending(sm => sm.TenantId).Ascending(sm => sm.ProductId).Descending(sm => sm.CreatedAt);
        await stockCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.StockMovement>(stockProductKeys));
        var stockCreatedKeys = Builders<Domain.Entities.StockMovement>.IndexKeys.Ascending(sm => sm.TenantId).Descending(sm => sm.CreatedAt);
        await stockCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.StockMovement>(stockCreatedKeys));

        // TenantFile indexes
        var fileCollection = GetCollection<Domain.Entities.TenantFile>("tenantFiles");
        var fileEntityKeys = Builders<Domain.Entities.TenantFile>.IndexKeys.Ascending(tf => tf.TenantId).Ascending(tf => tf.EntityId);
        await fileCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.TenantFile>(fileEntityKeys));
        var fileCreatedKeys = Builders<Domain.Entities.TenantFile>.IndexKeys.Ascending(tf => tf.TenantId).Descending(tf => tf.CreatedAt);
        await fileCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.TenantFile>(fileCreatedKeys));

        // AuditEvent indexes
        var auditCollection = GetCollection<Domain.Entities.AuditEvent>("auditEvents");
        var auditTenantKeys = Builders<Domain.Entities.AuditEvent>.IndexKeys.Ascending(ae => ae.TenantId).Descending(ae => ae.CreatedAt);
        await auditCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.AuditEvent>(auditTenantKeys));
        var auditOrgKeys = Builders<Domain.Entities.AuditEvent>.IndexKeys.Ascending(ae => ae.OrganizationId).Descending(ae => ae.CreatedAt);
        await auditCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.AuditEvent>(auditOrgKeys));
        var auditUserKeys = Builders<Domain.Entities.AuditEvent>.IndexKeys.Ascending(ae => ae.UserId).Descending(ae => ae.CreatedAt);
        await auditCollection.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.AuditEvent>(auditUserKeys));

        // RevokedToken: Jti is the [BsonId], so it is already unique via _id.
        // Mongo rejects an explicit Unique on an _id index, so only the TTL index
        // is created here - it lets Mongo purge expired revocations automatically.
        var revoked = GetCollection<Domain.Entities.RevokedToken>("revokedTokens");
        // Jti is mapped as [BsonId] (_id), so uniqueness is already enforced by MongoDB.
        // Creating an explicit unique index on _id is rejected by the server.
        await revoked.Indexes.CreateOneAsync(new CreateIndexModel<Domain.Entities.RevokedToken>(
            Builders<Domain.Entities.RevokedToken>.IndexKeys.Ascending(t => t.ExpiresAt), new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }));
    }
}
