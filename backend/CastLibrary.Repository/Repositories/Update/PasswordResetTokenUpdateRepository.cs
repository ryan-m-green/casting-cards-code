using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface IPasswordResetTokenUpdateRepository
    {
        Task MarkUsedAsync(Guid id);
    }

    public class PasswordResetTokenUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory) : IPasswordResetTokenUpdateRepository
    {
        public async Task MarkUsedAsync(Guid id)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                "UPDATE password_reset_tokens SET used_at = @UsedAt WHERE id = @Id",
                new { UsedAt = DateTime.UtcNow, Id = id });
        }
    }
}
