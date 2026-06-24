using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface IUserUpdateRepository
    {
        Task UpdatePasswordAsync(Guid userId, string newPasswordHash);
        Task UpdatePasswordAndIncrementTokenVersionAsync(Guid userId, string newPasswordHash);
        Task MergeKeywordsAsync(Guid userId, string[] newKeywords);
        Task UpdateRoleAndIncrementTokenVersionAsync(Guid userId, string newRole);
        Task SetEmailVerifiedAsync(Guid userId);
    }
    public class UserUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory) : IUserUpdateRepository
    {
        public async Task UpdatePasswordAsync(Guid userId, string newPasswordHash)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET password_hash = @Hash WHERE id = @Id",
                new { Hash = newPasswordHash, Id = userId });
        }

        public async Task UpdatePasswordAndIncrementTokenVersionAsync(Guid userId, string newPasswordHash)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET password_hash = @Hash, token_version = token_version + 1 WHERE id = @Id",
                new { Hash = newPasswordHash, Id = userId });
        }
        public async Task MergeKeywordsAsync(Guid userId, string[] newKeywords)
        {
            if (newKeywords is null || newKeywords.Length == 0) return;
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                @"UPDATE users
              SET keywords = ARRAY(
                  SELECT DISTINCT lower(unnest)
                  FROM unnest(keywords || @NewKeywords::text[])
              )
              WHERE id = @Id",
                new { Id = userId, NewKeywords = newKeywords });
        }

        public async Task UpdateRoleAndIncrementTokenVersionAsync(Guid userId, string newRole)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET role = @NewRole, token_version = token_version + 1 WHERE id = @Id",
                new { Id = userId, NewRole = newRole });
        }

        public async Task SetEmailVerifiedAsync(Guid userId)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET email_verified = true, email_verification_token = NULL WHERE id = @Id",
                new { Id = userId });
        }
    }
}
