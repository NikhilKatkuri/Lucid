using System.Text.Json;
using Lucid.Application.Common;
using MongoDB.Driver;

namespace Lucid.Api.Middleware;

/// <summary>
/// Converts known exceptions into the standard API envelope so the client
/// never sees a raw stack trace or an ambiguous 500.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message, ex.Errors);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Unique index violation (e.g. duplicate SKU within a tenant)
            await WriteAsync(context, StatusCodes.Status409Conflict, "Resource already exists");
        }
        catch (InvalidOperationException ex)
        {
            await WriteAsync(context, MapStatus(ex.Message), ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            await WriteAsync(context, StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteAsync(context, StatusCodes.Status500InternalServerError, "Internal server error");
        }
    }

    private static int MapStatus(string message) => message switch
    {
        "Product not found" => StatusCodes.Status404NotFound,
        "Product with this SKU already exists in the tenant" => StatusCodes.Status409Conflict,
        "Version conflict" => StatusCodes.Status409Conflict,
        "Insufficient stock" => StatusCodes.Status400BadRequest,
        "File not found" => StatusCodes.Status404NotFound,
        "User with this email already exists" => StatusCodes.Status409Conflict,
        "Organization with this slug already exists" => StatusCodes.Status409Conflict,
        "Tenant with this slug already exists in the organization" => StatusCodes.Status409Conflict,
        _ => StatusCodes.Status400BadRequest
    };

    private static async Task WriteAsync(HttpContext context, int statusCode, string message, List<ApiError>? errors = null)
    {
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            success = false,
            message,
            errors = errors ?? new List<ApiError>()
        }));
    }
}
