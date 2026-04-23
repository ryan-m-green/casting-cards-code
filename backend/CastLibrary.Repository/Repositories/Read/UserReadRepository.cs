using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IUserReadRepository
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<UserDomain> GetByEmailAsync(string email);
    Task<UserDomain> GetByIdAsync(Guid id);
    Task<string[]> GetKeywordsAsync(Guid userId);
    Task<List<UserDomain>> GetAllUsersAsync();
}

public class UserReadRepository(
    ISqlConnectionFactory sqlConnectionFactory, 
    IUserEntityMapper mapper) : IUserReadRepository
{
    public async Task<bool> ExistsByEmailAsync(string email)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        return await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = @Email)", new { Email = email });
    }

    public async Task<UserDomain> GetByEmailAsync(string email)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt
              FROM users WHERE email = @Email", new { Email = email });
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<UserDomain> GetByIdAsync(Guid id)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt
              FROM users WHERE id = @Id", new { Id = id });
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<string[]> GetKeywordsAsync(Guid userId)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryFirstOrDefaultAsync<string[]>(
            "SELECT keywords FROM users WHERE id = @Id", new { Id = userId });
        return result ?? [];
    }

    public async Task<List<UserDomain>> GetAllUsersAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt
              FROM users
              ORDER BY created_at DESC");
        return entities.Select(e => mapper.ToDomain(e)).ToList();
    }
}