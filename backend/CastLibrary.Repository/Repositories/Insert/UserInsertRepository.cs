using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface IUserInsertRepository
    {
        Task<UserDomain> InsertAsync(UserDomain user);
    }
    public class UserInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    IUserEntityMapper mapper) : IUserInsertRepository
    {
        public async Task<UserDomain> InsertAsync(UserDomain user)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            var entity = mapper.ToEntity(user);
            await conn.ExecuteAsync(
                @"INSERT INTO users (id, email, password_hash, display_name, role, created_at, email_verified, email_verification_token) 
                    VALUES (@Id, @Email, @PasswordHash, @DisplayName, @Role, @CreatedAt, @EmailVerified, @EmailVerificationToken)",
                    entity);
            return user;
        }
    }
}
