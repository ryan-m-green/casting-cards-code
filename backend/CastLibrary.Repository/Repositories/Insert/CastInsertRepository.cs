using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ICastInsertRepository
    {
        Task<CastDomain> InsertAsync(CastDomain cast);
    }
    public class CastInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICastInsertRepository
    {
        public async Task<CastDomain> InsertAsync(CastDomain cast)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                cast.Id,
                cast.DmUserId,
                cast.Name,
                cast.Pronouns,
                cast.Race,
                cast.Role,
                cast.Age,
                cast.Alignment,
                cast.Posture,
                cast.Speed,
                cast.VoicePlacement,
                cast.Description,
                cast.PublicDescription,
                cast.CreatedAt,
            };
            const string sql =
                @"INSERT INTO casts
                (id, dm_user_id, name, pronouns, race, role, age, alignment, posture, speed,
                 voice_placement, description, public_description, created_at)
              VALUES
                (@Id, @DmUserId, @Name, @Pronouns, @Race, @Role, @Age, @Alignment, @Posture, @Speed,
                 @VoicePlacement::text[], @Description, @PublicDescription, @CreatedAt)";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "casts", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "casts", @params, rows);
            return cast;
        }
    }
}
