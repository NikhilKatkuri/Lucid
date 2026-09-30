namespace Lucid.Domain.Enums;

public enum AuditAction
{
    Login = 0,
    LoginFailed = 1,
    TenantSwitch = 2,
    ProductCreate = 3,
    ProductUpdate = 4,
    ProductArchive = 5,
    StockAdjust = 6,
    FileUpload = 7,
    FileDownload = 8,
    MemberInvite = 9,
    MemberRemove = 10,
    RoleChange = 11,
    AccessDenied = 12,
    CrossTenantAttempt = 13,
    Logout = 14
}
