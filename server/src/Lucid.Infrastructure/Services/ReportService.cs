using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Reports;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public ReportService(MongoDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    public async Task<DashboardResponse> GetDashboardAsync(CancellationToken ct = default)
    {
        var productCollection = _dbContext.GetCollection<Product>("products");
        var movementCollection = _dbContext.GetCollection<StockMovement>("stockMovements");

        var products = await productCollection.Find(p => p.TenantId == _tenantContext.TenantId && !p.IsArchived).ToListAsync(ct);

        var totalProducts = products.Count;
        var totalStock = products.Sum(p => p.Quantity);
        var lowStockProducts = products.Count(p => p.Quantity > 0 && p.Quantity <= p.ReorderLevel);
        var outOfStockProducts = products.Count(p => p.Quantity == 0);
        var inventoryValue = products.Sum(p => p.Price * p.Quantity);

        var lowStockItems = products
            .Where(p => p.Quantity > 0 && p.Quantity <= p.ReorderLevel)
            .OrderBy(p => p.Quantity)
            .Take(5)
            .Select(p => new LowStockItem
            {
                ProductId = p.Id,
                Sku = p.Sku,
                Name = p.Name,
                Quantity = p.Quantity,
                ReorderLevel = p.ReorderLevel
            })
            .ToList();

        var recentMovements = await movementCollection
            .Find(m => m.TenantId == _tenantContext.TenantId)
            .SortByDescending(m => m.CreatedAt)
            .Limit(10)
            .ToListAsync(ct);

        var productDict = products.ToDictionary(p => p.Id, p => p.Name);

        var recentMovementDtos = recentMovements.Select(m => new RecentMovement
        {
            MovementId = m.Id,
            ProductId = m.ProductId,
            ProductName = productDict.GetValueOrDefault(m.ProductId, "Unknown"),
            Type = m.Type.ToString(),
            QuantityDelta = m.QuantityDelta,
            AfterQuantity = m.AfterQuantity,
            Reason = m.Reason,
            CreatedAt = m.CreatedAt
        }).ToList();

        return new DashboardResponse
        {
            TotalProducts = totalProducts,
            TotalStock = totalStock,
            LowStockProducts = lowStockProducts,
            OutOfStockProducts = outOfStockProducts,
            InventoryValue = inventoryValue,
            LowStockItems = lowStockItems,
            RecentMovements = recentMovementDtos
        };
    }

    public async Task<OrganizationDashboardResponse> GetOrganizationDashboardAsync(CancellationToken ct = default)
    {
        var tenantService = new TenantService(_dbContext);
        var tenants = await tenantService.GetByOrganizationAsync(_tenantContext.OrganizationId, ct);

        var productCollection = _dbContext.GetCollection<Product>("products");
        var tenantIds = tenants.Select(t => t.Id).ToList();
        var allProducts = await productCollection.Find(p => tenantIds.Contains(p.TenantId) && !p.IsArchived).ToListAsync(ct);

        var tenantSummaries = new List<TenantSummary>();
        foreach (var tenant in tenants)
        {
            var tenantProducts = allProducts.Where(p => p.TenantId == tenant.Id).ToList();
            tenantSummaries.Add(new TenantSummary
            {
                TenantId = tenant.Id,
                TenantName = tenant.Name,
                TotalProducts = tenantProducts.Count,
                TotalStock = tenantProducts.Sum(p => p.Quantity),
                LowStockProducts = tenantProducts.Count(p => p.Quantity > 0 && p.Quantity <= p.ReorderLevel),
                OutOfStockProducts = tenantProducts.Count(p => p.Quantity == 0),
                InventoryValue = tenantProducts.Sum(p => p.Price * p.Quantity)
            });
        }

        return new OrganizationDashboardResponse
        {
            TotalProducts = tenantSummaries.Sum(t => t.TotalProducts),
            TotalStock = tenantSummaries.Sum(t => t.TotalStock),
            LowStockProducts = tenantSummaries.Sum(t => t.LowStockProducts),
            OutOfStockProducts = tenantSummaries.Sum(t => t.OutOfStockProducts),
            InventoryValue = tenantSummaries.Sum(t => t.InventoryValue),
            Tenants = tenantSummaries
        };
    }
}
