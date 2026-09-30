using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Auth;
using Lucid.Domain.Entities;
using Lucid.Infrastructure.Data;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly MongoDbContext _dbContext;

    public UserService(MongoDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<User>("users");
        return await collection.Find(u => u.Id == id).FirstOrDefaultAsync(ct);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<User>("users");
        return await collection.Find(u => u.Email.ToLower() == email.ToLower()).FirstOrDefaultAsync(ct);
    }

    public async Task<User> CreateAsync(string email, string password, string displayName, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<User>("users");

        var existing = await collection.Find(u => u.Email.ToLower() == email.ToLower()).FirstOrDefaultAsync(ct);
        if (existing != null)
            throw new InvalidOperationException("User with this email already exists");

        var passwordHasher = new PasswordHasher();
        var user = new User
        {
            Email = email,
            PasswordHash = passwordHasher.Hash(password),
            DisplayName = displayName,
            IsActive = true,
            EmailVerified = false
        };

        await collection.InsertOneAsync(user, cancellationToken: ct);
        return user;
    }

    public async Task<bool> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await GetByEmailAsync(email, ct);
        if (user == null || !user.IsActive)
            return false;

        var passwordHasher = new PasswordHasher();
        return passwordHasher.Verify(password, user.PasswordHash);
    }

    public async Task<User> UpdateAsync(string id, string displayName, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<User>("users");
        var update = Builders<User>.Update
            .Set(u => u.DisplayName, displayName)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        var result = await collection.FindOneAndUpdateAsync(
            u => u.Id == id,
            update,
            new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After },
            ct);

        if (result == null)
            throw new InvalidOperationException("User not found");

        return result;
    }
}
