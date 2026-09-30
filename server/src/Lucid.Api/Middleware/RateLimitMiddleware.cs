namespace Lucid.Api.Middleware;

public class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly Dictionary<string, (int Count, DateTime WindowStart)> _requests = new();
    private static readonly object _lock = new();
    private const int DefaultLimit = 100;
    private const int DefaultWindowSeconds = 60;

    public RateLimitMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = context.User?.Identity?.IsAuthenticated == true
            ? context.User.FindFirst("sub")?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        var now = DateTime.UtcNow;
        var key = $"{context.Request.Path}:{clientId}";

        lock (_lock)
        {
            if (!_requests.TryGetValue(key, out var entry) || (now - entry.WindowStart).TotalSeconds > DefaultWindowSeconds)
            {
                _requests[key] = (1, now);
            }
            else if (entry.Count >= DefaultLimit)
            {
                context.Response.StatusCode = 429;
                context.Response.Headers.Append("Retry-After", DefaultWindowSeconds.ToString());
                return;
            }
            else
            {
                _requests[key] = (entry.Count + 1, entry.WindowStart);
            }
        }

        await _next(context);
    }
}
