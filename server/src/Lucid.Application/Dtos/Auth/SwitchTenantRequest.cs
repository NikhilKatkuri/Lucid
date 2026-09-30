using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Auth;

public class SwitchTenantRequest
{
    [Required]
    public string TenantId { get; set; } = string.Empty;
}
