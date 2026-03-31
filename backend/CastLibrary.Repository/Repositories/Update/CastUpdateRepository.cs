using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ICastUpdateRepository
    {
        Task<CastDomain> UpdateAsync(CastDomain cast);
    }
    public class CastUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICastUpdateRepository
    {
        public async Task<CastDomain> UpdateAsync(CastDomain cast)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                cast.Id,
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
            };
            const string sql =
                @"UPDATE casts
              SET name=@Name, pronouns=@Pronouns, race=@Race, role=@Role, age=@Age,
                  alignment=@Alignment, posture=@Posture, speed=@Speed,
                  voice_placement=@VoicePlacement::text[],
                  description=@Description, public_description=@PublicDescription
              WHERE id=@Id";

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "casts", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "casts", @params, rows);
            return cast;
        }
    }
}
