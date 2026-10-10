using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IConditionInsertRepository
{
    Task<ConditionDomain> InsertAsync(ConditionDomain domain);
}

public class ConditionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IConditionEntityMapper mapper) : IConditionInsertRepository
{
    public async Task<ConditionDomain> InsertAsync(ConditionDomain domain)
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
            domain.CreatedAt,
            domain.UpdatedAt,
        };

        const string sql =
            @"INSERT INTO conditions
                (id, gm_user_id, name, consequence, keywords, color, created_at, updated_at)
              VALUES
                (@Id, @GmUserId, @Name, @Consequence, @Keywords, @Color, @CreatedAt, @UpdatedAt)
              RETURNING id,
                        gm_user_id  AS GmUserId,
                        name,
                        consequence AS Consequence,
                        keywords    AS Keywords,
                        color       AS Color,
                        created_at  AS CreatedAt,
                        updated_at  AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<ConditionEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "conditions", @params, 1);

        return mapper.ToDomain(row);
    }
}
