namespace Lucid.Domain.Enums;

public enum Permission
{
    // Inventory
    ProductRead,
    ProductCreate,
    ProductUpdate,
    ProductArchive,
    StockAdjust,

    // Files
    FileRead,
    FileUpload,
    FileDownload,

    // Members
    MemberInvite,
    MemberRemove,
    RoleChange,

    // Reports
    ReportRead,
    OrganizationReport,

    // Tenant management
    TenantManage,
    MemberManage
}
