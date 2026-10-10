using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IConditionUpdateRepository
{
    Task<ConditionDomain?> UpdateAsync(ConditionDomain domain);
}

public class ConditionUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IConditionEntityMapper mapper) : IConditionUpdateRepository
{
    public async Task<ConditionDomain?> UpdateAsync(ConditionDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.GmUserId,
            domain.Name,
            domain.Consequence,
            Keywords = domain.Keywords.ToArray(),
            domain.Color,
            domain.UpdatedAt,
        };

        const string sql =
            @"UPDATE conditions
              SET    name        = @Name,
                     consequence = @Consequence,
                     keywords    = @Keywords,
                     color       = @Color,
                     updated_at  = @UpdatedAt
              WHERE  id          = @Id
                AND  gm_user_id  = @GmUserId
              RETURNING id,
                        gm_user_id  AS GmUserId,
                        name,
                        consequence AS Consequence,
                        keywords    AS Keywords,
                        color       AS Color,
                        created_at  AS CreatedAt,
                        updated_at  AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<ConditionEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "conditions",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}
