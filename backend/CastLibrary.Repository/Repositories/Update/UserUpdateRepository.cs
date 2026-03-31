using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface IUserUpdateRepository
    {
        Task UpdatePasswordAsync(Guid userId, string newPasswordHash);
        Task MergeKeywordsAsync(Guid userId, string[] newKeywords);
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
    }
}
