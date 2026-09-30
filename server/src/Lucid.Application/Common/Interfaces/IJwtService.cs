using System.Security.Claims;

namespace Lucid.Application.Common.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(string userId, string email, string? tenantId = null);
    ClaimsPrincipal? ValidateToken(string token);
}
