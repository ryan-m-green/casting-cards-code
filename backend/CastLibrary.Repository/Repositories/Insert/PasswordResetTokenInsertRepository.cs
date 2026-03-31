using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface IPasswordResetTokenInsertRepository
    {
        Task InsertAsync(PasswordResetTokenDomain token);
    }
    public class PasswordResetTokenInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory) : IPasswordResetTokenInsertRepository
    {
        public async Task InsertAsync(PasswordResetTokenDomain token)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                @"INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
              VALUES (@Id, @UserId, @TokenHash, @ExpiresAt)",
                new { token.Id, token.UserId, token.TokenHash, token.ExpiresAt });
        }
    }
}
