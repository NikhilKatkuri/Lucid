using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Auth;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Security.Claims;

namespace Lucid.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IOrganizationService _organizationService;
    private readonly ITenantService _tenantService;
    private readonly IJwtService _jwtService;
    private readonly IAuditService _auditService;
    private readonly MongoDbContext _dbContext;

    public AuthController(
        IUserService userService,
        IOrganizationService organizationService,
        ITenantService tenantService,
        IJwtService jwtService,
        IAuditService auditService,
        MongoDbContext dbContext)
    {
        _userService = userService;
        _organizationService = organizationService;
        _tenantService = tenantService;
        _jwtService = jwtService;
        _auditService = auditService;
        _dbContext = dbContext;
    }

    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> SignUp([FromBody] SignUpRequest request, CancellationToken ct)
    {
        var user = await _userService.CreateAsync(request.Email, request.Password, request.DisplayName, ct);

        // Create default organization and tenant
        var orgSlug = user.Email.Split('@')[0].ToLower().Replace(".", "-");
        var org = await _organizationService.CreateAsync(user.DisplayName, orgSlug, user.Id, ct);
        var tenant = await _tenantService.CreateAsync(org.Id, "Main", orgSlug, TenantType.Store, ct);

        // Create tenant membership
        var membershipCollection = _dbContext.GetCollection<TenantMembership>("tenantMemberships");
        await membershipCollection.InsertOneAsync(new TenantMembership
        {
            TenantId = tenant.Id,
            UserId = user.Id,
            Role = TenantRole.Manager
        }, cancellationToken: ct);

        var token = _jwtService.GenerateAccessToken(user.Id, user.Email, tenant.Id);

        return Ok(ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            AccessToken = token,
            ExpiresIn = 3600,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                EmailVerified = user.EmailVerified
            }
        }, "User created successfully"));
    }

    [HttpPost("signin")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> SignIn([FromBody] SignInRequest request, CancellationToken ct)
    {
        var isValid = await _userService.ValidateCredentialsAsync(request.Email, request.Password, ct);
        if (!isValid)
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Invalid email or password"));

        var user = await _userService.GetByEmailAsync(request.Email, ct);
        if (user == null)
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Invalid email or password"));

        var tenants = await _tenantService.GetByUserAsync(user.Id, ct);
        var defaultTenant = tenants.FirstOrDefault();

        var token = _jwtService.GenerateAccessToken(user.Id, user.Email, defaultTenant?.Id);

        return Ok(ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            AccessToken = token,
            ExpiresIn = 3600,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                EmailVerified = user.EmailVerified
            }
        }, "Signed in successfully"));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<MeResponse>>> Me(CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(ApiResponse<MeResponse>.Fail("Unauthorized"));

        var user = await _userService.GetByIdAsync(userId, ct);
        if (user == null)
            return Unauthorized(ApiResponse<MeResponse>.Fail("User not found"));

        var tenants = await _tenantService.GetByUserAsync(userId, ct);
        var tokenTenantId = User.FindFirst("tenantId")?.Value;
        var currentTenant = tenants.FirstOrDefault(t => t.Id == tokenTenantId) ?? tenants.FirstOrDefault();

        var org = currentTenant != null ? await _organizationService.GetByIdAsync(currentTenant.OrganizationId, ct) : null;

        var availableTenants = new List<TenantSummaryDto>();
        foreach (var tenant in tenants)
        {
            var tenantOrg = await _organizationService.GetByIdAsync(tenant.OrganizationId, ct);
            var membership = await _tenantService.GetMembershipAsync(tenant.Id, userId, ct);
            availableTenants.Add(new TenantSummaryDto
            {
                TenantId = tenant.Id,
                OrganizationId = tenant.OrganizationId,
                Name = tenant.Name,
                Slug = tenant.Slug,
                Type = tenant.Type,
                Role = membership?.Role ?? TenantRole.Viewer,
                OrganizationName = tenantOrg?.Name ?? "Unknown"
            });
        }

        return Ok(ApiResponse<MeResponse>.Ok(new MeResponse
        {
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                EmailVerified = user.EmailVerified
            },
            CurrentTenant = currentTenant != null ? new TenantContextDto
            {
                TenantId = currentTenant.Id,
                TenantName = currentTenant.Name,
                TenantSlug = currentTenant.Slug,
                OrganizationId = currentTenant.OrganizationId,
                OrganizationName = org?.Name ?? "Unknown",
                Role = (await _tenantService.GetMembershipAsync(currentTenant.Id, userId, ct))?.Role ?? TenantRole.Viewer
            } : null,
            AvailableTenants = availableTenants
        }));
    }

    [HttpGet("my-orgs")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<TenantSummaryDto>>>> MyOrgs(CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(ApiResponse<List<TenantSummaryDto>>.Fail("Unauthorized"));

        var tenants = await _tenantService.GetByUserAsync(userId, ct);
        var result = new List<TenantSummaryDto>();

        foreach (var tenant in tenants)
        {
            var org = await _organizationService.GetByIdAsync(tenant.OrganizationId, ct);
            var membership = await _tenantService.GetMembershipAsync(tenant.Id, userId, ct);
            result.Add(new TenantSummaryDto
            {
                TenantId = tenant.Id,
                OrganizationId = tenant.OrganizationId,
                Name = tenant.Name,
                Slug = tenant.Slug,
                Type = tenant.Type,
                Role = membership?.Role ?? TenantRole.Viewer,
                OrganizationName = org?.Name ?? "Unknown"
            });
        }

        return Ok(ApiResponse<List<TenantSummaryDto>>.Ok(result));
    }

    [HttpPost("switch-tenant")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> SwitchTenant([FromBody] SwitchTenantRequest request, CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Unauthorized"));

        var hasMembership = await _tenantService.HasMembershipAsync(request.TenantId, userId, ct);
        if (!hasMembership)
            return Forbid();

        var user = await _userService.GetByIdAsync(userId, ct);
        if (user == null)
            return Unauthorized(ApiResponse<AuthResponse>.Fail("User not found"));

        var token = _jwtService.GenerateAccessToken(user.Id, user.Email, request.TenantId);

        return Ok(ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            AccessToken = token,
            ExpiresIn = 3600,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                EmailVerified = user.EmailVerified
            }
        }, "Tenant switched successfully"));
    }

    /// <summary>
    /// Logout. With stateless JWT, the client discards the token.
    /// A token revocation entry is written so the token cannot be reused.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object>>> Logout(CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(ApiResponse<object>.Fail("Unauthorized"));

        var jti = User.FindFirst("jti")?.Value;
        if (!string.IsNullOrEmpty(jti))
        {
            var revoked = _dbContext.GetCollection<RevokedToken>("revokedTokens");
            await revoked.InsertOneAsync(new RevokedToken
            {
                Jti = jti,
                UserId = userId,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            }, cancellationToken: ct);
        }

        await _auditService.RecordAsync(Domain.Enums.AuditAction.Logout, "User", userId, Domain.Enums.AuditResult.Success, null, ct);

        return Ok(ApiResponse<object>.Ok(new { }, "Signed out successfully"));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        // Always return the same response so the endpoint cannot be used to
        // enumerate which email addresses have accounts.
        // TODO: issue a single-use reset token and email it.
        return Task.FromResult<ActionResult<ApiResponse<object>>>(
            StatusCode(StatusCodes.Status501NotImplemented, ApiResponse<object>.Fail("Password reset is not configured")));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public Task<ActionResult<ApiResponse<object>>> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        // TODO: validate the single-use token, then rotate the password hash
        // and revoke all outstanding tokens for the user.
        return Task.FromResult<ActionResult<ApiResponse<object>>>(
            StatusCode(StatusCodes.Status501NotImplemented, ApiResponse<object>.Fail("Password reset is not configured")));
    }
}
