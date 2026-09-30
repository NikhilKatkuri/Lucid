using Lucid.Application.Dtos.Auth;
using Lucid.Domain.Entities;

namespace Lucid.Application.Common.Interfaces;

public interface IUserService
{
    Task<User?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User> CreateAsync(string email, string password, string displayName, CancellationToken ct = default);
    Task<bool> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default);
    Task<User> UpdateAsync(string id, string displayName, CancellationToken ct = default);
}
