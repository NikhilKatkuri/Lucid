namespace Lucid.Api.Middleware;

public class RequestIdMiddleware
{
    private readonly RequestDelegate _next;

    public RequestIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = Guid.NewGuid().ToString("N");
        context.TraceIdentifier = requestId;
        context.Response.Headers.Append("X-Request-ID", requestId);
        await _next(context);
    }
}
