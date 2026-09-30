namespace Lucid.Application.Common;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);

    public static PagedResult<T> Create(List<T> items, int page, int pageSize, int total)
    {
        return new PagedResult<T> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }
}
