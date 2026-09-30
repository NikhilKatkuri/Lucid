using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Inventory;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public ProductService(MongoDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    public async Task<Product> CreateAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");

        var existing = await collection.Find(p => p.TenantId == _tenantContext.TenantId && p.Sku == request.Sku).FirstOrDefaultAsync(ct);
        if (existing != null)
            throw new InvalidOperationException("Product with this SKU already exists in the tenant");

        var product = new Product
        {
            TenantId = _tenantContext.TenantId,
            Sku = request.Sku,
            Name = request.Name,
            Category = request.Category,
            Quantity = request.Quantity,
            ReorderLevel = request.ReorderLevel,
            Price = request.Price,
            Version = 0,
            IsArchived = false
        };

        await collection.InsertOneAsync(product, cancellationToken: ct);
        return product;
    }

    public async Task<Product?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");
        return await collection.Find(p => p.Id == id && p.TenantId == _tenantContext.TenantId && !p.IsArchived).FirstOrDefaultAsync(ct);
    }

    public async Task<PagedResult<Product>> ListAsync(ProductListRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");
        var filter = Builders<Product>.Filter.Eq(p => p.TenantId, _tenantContext.TenantId);

        if (request.IsArchived.HasValue)
            filter &= Builders<Product>.Filter.Eq(p => p.IsArchived, request.IsArchived.Value);
        else
            filter &= Builders<Product>.Filter.Eq(p => p.IsArchived, false);

        if (!string.IsNullOrEmpty(request.Search))
        {
            var searchFilter = Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Regex(p => p.Name, new MongoDB.Bson.BsonRegularExpression(request.Search, "i")),
                Builders<Product>.Filter.Regex(p => p.Sku, new MongoDB.Bson.BsonRegularExpression(request.Search, "i"))
            );
            filter &= searchFilter;
        }

        if (!string.IsNullOrEmpty(request.Category))
            filter &= Builders<Product>.Filter.Eq(p => p.Category, request.Category);

        if (!string.IsNullOrEmpty(request.StockStatus))
        {
            var stockStatus = request.StockStatus.ToLower();
            if (stockStatus == "out")
            {
                filter &= Builders<Product>.Filter.Eq("quantity", 0);
            }
            else if (stockStatus == "low")
            {
                // field-to-field comparison requires $expr
                filter &= Builders<Product>.Filter.And(
                    Builders<Product>.Filter.Gt("quantity", 0),
                    new BsonDocumentFilterDefinition<Product>(new BsonDocument("$expr", new BsonDocument("$lte", new BsonArray { "$quantity", "$reorderLevel" }))));
            }
            else if (stockStatus == "in")
            {
                filter &= new BsonDocumentFilterDefinition<Product>(new BsonDocument("$expr", new BsonDocument("$gt", new BsonArray { "$quantity", "$reorderLevel" })));
            }
        }

        var total = await collection.CountDocumentsAsync(filter, cancellationToken: ct);

        var sortField = request.SortBy?.ToLower() switch
        {
            "name" => "name",
            "sku" => "sku",
            "price" => "price",
            "updated" => "updatedAt",
            _ => "createdAt"
        };

        var sort = request.SortDirection?.ToLower() == "desc"
            ? Builders<Product>.Sort.Descending(sortField)
            : Builders<Product>.Sort.Ascending(sortField);

        var items = await collection.Find(filter)
            .Sort(sort)
            .Skip((request.Page - 1) * request.PageSize)
            .Limit(request.PageSize)
            .ToListAsync(ct);

        return PagedResult<Product>.Create(items, request.Page, request.PageSize, (int)total);
    }

    public async Task<Product> UpdateAsync(string id, UpdateProductRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");
        var product = await collection.Find(p => p.Id == id && p.TenantId == _tenantContext.TenantId).FirstOrDefaultAsync(ct);
        if (product == null)
            throw new InvalidOperationException("Product not found");

        if (product.Version != request.Version)
            throw new InvalidOperationException("Version conflict");

        var update = Builders<Product>.Update
            .Set(p => p.Name, request.Name)
            .Set(p => p.Category, request.Category)
            .Set(p => p.ReorderLevel, request.ReorderLevel)
            .Set(p => p.Price, request.Price)
            .Set(p => p.Version, product.Version + 1)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        var result = await collection.FindOneAndUpdateAsync(
            p => p.Id == id && p.TenantId == _tenantContext.TenantId && p.Version == request.Version,
            update,
            new FindOneAndUpdateOptions<Product> { ReturnDocument = ReturnDocument.After },
            ct);

        if (result == null)
            throw new InvalidOperationException("Version conflict");

        return result;
    }

    public async Task<bool> ArchiveAsync(string id, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");
        var update = Builders<Product>.Update
            .Set(p => p.IsArchived, true)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);
        var result = await collection.UpdateOneAsync(p => p.Id == id && p.TenantId == _tenantContext.TenantId, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> RestoreAsync(string id, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");
        var update = Builders<Product>.Update
            .Set(p => p.IsArchived, false)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);
        var result = await collection.UpdateOneAsync(p => p.Id == id && p.TenantId == _tenantContext.TenantId, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public async Task<StockAdjustmentResult> AdjustStockAsync(string productId, AdjustStockRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<Product>("products");
        var product = await collection.Find(p => p.Id == productId && p.TenantId == _tenantContext.TenantId && !p.IsArchived).FirstOrDefaultAsync(ct);
        if (product == null)
            throw new InvalidOperationException("Product not found");
        var movementCollection = _dbContext.GetCollection<StockMovement>("stockMovements");
        using var session = await _dbContext.Client.StartSessionAsync(cancellationToken: ct);
        StockAdjustmentResult? result = null;
        await session.WithTransactionAsync(async (s, token) =>
        {
            var guard = Builders<Product>.Filter.Eq(p => p.Id, productId) &
                        Builders<Product>.Filter.Eq(p => p.TenantId, _tenantContext.TenantId) &
                        Builders<Product>.Filter.Eq(p => p.IsArchived, false);
            if (request.QuantityDelta < 0)
                guard &= Builders<Product>.Filter.Gte(p => p.Quantity, -request.QuantityDelta);

            var updated = await collection.FindOneAndUpdateAsync(s, guard,
                Builders<Product>.Update.Inc(p => p.Quantity, request.QuantityDelta).Set(p => p.UpdatedAt, DateTime.UtcNow),
                new FindOneAndUpdateOptions<Product> { ReturnDocument = ReturnDocument.Before }, token);
            if (updated == null)
            {
                var stillExists = await collection.Find(s, p => p.Id == productId && p.TenantId == _tenantContext.TenantId && !p.IsArchived).AnyAsync(token);
                throw new InvalidOperationException(stillExists ? "Insufficient stock" : "Product not found");
            }

            var after = updated.Quantity + request.QuantityDelta;
            var movement = new StockMovement
            {
                TenantId = _tenantContext.TenantId, ProductId = productId,
                Type = StockMovementType.Adjustment, QuantityDelta = request.QuantityDelta,
                BeforeQuantity = updated.Quantity, AfterQuantity = after,
                Reason = request.Reason, PerformedByUserId = _tenantContext.UserId
            };
            await movementCollection.InsertOneAsync(s, movement, cancellationToken: token);
            result = new StockAdjustmentResult { ProductId = productId, BeforeQuantity = updated.Quantity,
                AfterQuantity = after, Delta = request.QuantityDelta, MovementId = movement.Id };
            return true;
        }, cancellationToken: ct);
        return result!;
    }

    public async Task<List<StockMovement>> GetMovementsAsync(string productId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<StockMovement>("stockMovements");
        return await collection.Find(m => m.ProductId == productId && m.TenantId == _tenantContext.TenantId)
            .SortByDescending(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<StockMovement>> GetTenantMovementsAsync(CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<StockMovement>("stockMovements");
        return await collection.Find(m => m.TenantId == _tenantContext.TenantId)
            .SortByDescending(m => m.CreatedAt).Limit(500).ToListAsync(ct);
    }
}
