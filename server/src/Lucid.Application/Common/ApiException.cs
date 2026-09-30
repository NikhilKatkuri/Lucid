namespace Lucid.Application.Common;

public class ApiException : Exception
{
    public int StatusCode { get; }
    public List<ApiError> Errors { get; }

    public ApiException(int statusCode, string message, List<ApiError>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors ?? new List<ApiError>();
    }

    public static ApiException BadRequest(string message, List<ApiError>? errors = null)
        => new(400, message, errors);

    public static ApiException Unauthorized(string message = "Unauthorized")
        => new(401, message);

    public static ApiException Forbidden(string message = "Forbidden")
        => new(403, message);

    public static ApiException NotFound(string message = "Not found")
        => new(404, message);

    public static ApiException Conflict(string message)
        => new(409, message);

    public static ApiException Validation(string message, List<ApiError> errors)
        => new(422, message, errors);

    public static ApiException TooManyRequests(string message = "Too many requests")
        => new(429, message);

    public static ApiException Internal(string message = "Internal server error")
        => new(500, message);
}
