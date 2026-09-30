using System.ComponentModel.DataAnnotations;

namespace Lucid.Application.Dtos.Auth;

public class SignInRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}
