using Lucid.Api.Authorization;
using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Inventory;
using Lucid.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lucid.Api.Controllers;

[ApiController]
[Route("api/v1/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IProductService _productService;

    public InventoryController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpPost("products")]
    [AuthorizePermission(Permission.ProductCreate)]
    public async Task<ActionResult<ApiResponse<Domain.Entities.Product>>> CreateProduct([FromBody] CreateProductRequest request, CancellationToken ct)
    {
        var product = await _productService.CreateAsync(request, ct);
        return Ok(ApiResponse<Domain.Entities.Product>.Ok(product, "Product created successfully"));
    }

    [HttpGet("products")]
    [AuthorizePermission(Permission.ProductRead)]
    public async Task<ActionResult<ApiResponse<PagedResult<Domain.Entities.Product>>>> ListProducts([FromQuery] ProductListRequest request, CancellationToken ct)
    {
        var result = await _productService.ListAsync(request, ct);
        return Ok(new ApiResponse<PagedResult<Domain.Entities.Product>>
        {
            Success = true,
            Message = "Products retrieved",
            Data = result,
            Pagination = new PaginationInfo
            {
                Page = result.Page,
                PageSize = result.PageSize,
                Total = result.Total
            }
        });
    }

    [HttpGet("products/{id}")]
    [AuthorizePermission(Permission.ProductRead)]
    public async Task<ActionResult<ApiResponse<Domain.Entities.Product>>> GetProduct(string id, CancellationToken ct)
    {
        var product = await _productService.GetByIdAsync(id, ct);
        if (product == null)
            return NotFound(ApiResponse<Domain.Entities.Product>.Fail("Product not found"));

        return Ok(ApiResponse<Domain.Entities.Product>.Ok(product));
    }

    [HttpPut("products/{id}")]
    [AuthorizePermission(Permission.ProductUpdate)]
    public async Task<ActionResult<ApiResponse<Domain.Entities.Product>>> UpdateProduct(string id, [FromBody] UpdateProductRequest request, CancellationToken ct)
    {
        try
        {
            var product = await _productService.UpdateAsync(id, request, ct);
            return Ok(ApiResponse<Domain.Entities.Product>.Ok(product, "Product updated successfully"));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Version conflict"))
        {
            return Conflict(ApiResponse<Domain.Entities.Product>.Fail("Version conflict"));
        }
    }

    [HttpDelete("products/{id}")]
    [AuthorizePermission(Permission.ProductArchive)]
    public async Task<ActionResult<ApiResponse<object>>> ArchiveProduct(string id, CancellationToken ct)
    {
        var result = await _productService.ArchiveAsync(id, ct);
        if (!result)
            return NotFound(ApiResponse<object>.Fail("Product not found"));

        return Ok(ApiResponse<object>.Ok(new { }, "Product archived successfully"));
    }

    [HttpPost("products/{id}/restore")]
    [AuthorizePermission(Permission.ProductUpdate)]
    public async Task<ActionResult<ApiResponse<object>>> RestoreProduct(string id, CancellationToken ct)
    {
        var result = await _productService.RestoreAsync(id, ct);
        if (!result)
            return NotFound(ApiResponse<object>.Fail("Product not found"));

        return Ok(ApiResponse<object>.Ok(new { }, "Product restored successfully"));
    }

    [HttpPost("products/{id}/adjust")]
    [AuthorizePermission(Permission.StockAdjust)]
    public async Task<ActionResult<ApiResponse<StockAdjustmentResult>>> AdjustStock(string id, [FromBody] AdjustStockRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _productService.AdjustStockAsync(id, request, ct);
            return Ok(ApiResponse<StockAdjustmentResult>.Ok(result, "Stock adjusted successfully"));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Insufficient stock"))
        {
            return BadRequest(ApiResponse<StockAdjustmentResult>.Fail("Insufficient stock"));
        }
    }

    [HttpGet("products/{id}/movements")]
    [AuthorizePermission(Permission.ProductRead)]
    public async Task<ActionResult<ApiResponse<List<Domain.Entities.StockMovement>>>> GetMovements(string id, CancellationToken ct)
    {
        var movements = await _productService.GetMovementsAsync(id, ct);
        return Ok(ApiResponse<List<Domain.Entities.StockMovement>>.Ok(movements));
    }
}
