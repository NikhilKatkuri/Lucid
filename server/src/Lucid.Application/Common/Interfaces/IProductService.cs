using Lucid.Application.Common;
using Lucid.Application.Dtos.Inventory;
using Lucid.Domain.Entities;

namespace Lucid.Application.Common.Interfaces;

public interface IProductService
{
    Task<Product> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
    Task<Product?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<PagedResult<Product>> ListAsync(ProductListRequest request, CancellationToken ct = default);
    Task<Product> UpdateAsync(string id, UpdateProductRequest request, CancellationToken ct = default);
    Task<bool> ArchiveAsync(string id, CancellationToken ct = default);
    Task<bool> RestoreAsync(string id, CancellationToken ct = default);
    Task<StockAdjustmentResult> AdjustStockAsync(string productId, AdjustStockRequest request, CancellationToken ct = default);
    Task<List<StockMovement>> GetMovementsAsync(string productId, CancellationToken ct = default);
}
