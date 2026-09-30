using Lucid.Application.Common.Interfaces;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Lucid.Api.Authorization;

/// <summary>
/// Authorization filter that enforces permissions using the effective role
/// already resolved and membership-verified by TenantResolutionMiddleware.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class AuthorizePermissionAttribute : Attribute, IAuthorizationFilter
{
    private readonly Permission[] _required;

    public AuthorizePermissionAttribute(params Permission[] required)
    {
        _required = required;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var tenantContext = context.HttpContext.RequestServices
            .GetService<ITenantContext>() as TenantContext;

        // No tenant context means the tenant middleware already rejected the
        // request (or the endpoint is tenant-less). Fail closed.
        if (tenantContext == null || !tenantContext.IsAuthenticated)
        {
            context.Result = new ForbidResult();
            return;
        }

        var granted = RolePermissions.For(tenantContext.Role);

        if (_required.Length > 0 && !_required.Any(granted.Contains))
            context.Result = new ForbidResult();
    }
}

public static class RolePermissions
{
    public static IReadOnlySet<Permission> For(TenantRole role) => role switch
    {
        TenantRole.Manager => new HashSet<Permission>
        {
            Permission.ProductRead, Permission.ProductCreate, Permission.ProductUpdate,
            Permission.ProductArchive, Permission.StockAdjust,
            Permission.FileRead, Permission.FileUpload, Permission.FileDownload,
            Permission.ReportRead
        },
        TenantRole.Staff => new HashSet<Permission>
        {
            Permission.ProductRead, Permission.ProductCreate, Permission.ProductUpdate,
            Permission.StockAdjust,
            Permission.FileRead, Permission.FileUpload, Permission.FileDownload,
            Permission.ReportRead
        },
        _ => new HashSet<Permission>
        {
            Permission.ProductRead,
            Permission.FileRead, Permission.FileDownload,
            Permission.ReportRead
        }
    };
}
