using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPasswordResetTokenReadRepository
{
    Task<PasswordResetTokenDomain> GetByTokenHashAsync(string hash);
    
}
public class PasswordResetTokenReadRepository(
    ISqlConnectionFactory sqlConnectionFactory, 
    IPasswordResetTokenEntityMapper mapper) : IPasswordResetTokenReadRepository
{
    public async Task<PasswordResetTokenDomain> GetByTokenHashAsync(string hash)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PasswordResetTokenEntity>(
            @"SELECT id, user_id AS UserId, token_hash AS TokenHash, expires_at AS ExpiresAt, used_at AS UsedAt
              FROM password_reset_tokens
              WHERE token_hash = @Hash
              ORDER BY expires_at DESC
              LIMIT 1",
            new { Hash = hash });
        return entity is null ? null : mapper.ToDomain(entity);
    }
}