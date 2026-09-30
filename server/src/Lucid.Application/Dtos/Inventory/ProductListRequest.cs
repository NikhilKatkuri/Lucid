namespace Lucid.Application.Dtos.Inventory;

public class ProductListRequest
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public string? StockStatus { get; set; }
    public bool? IsArchived { get; set; }
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
