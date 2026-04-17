using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCardConditionInsertRepository
{
    Task<PlayerCardConditionDomain> InsertAsync(PlayerCardConditionDomain condition);
}

public class PlayerCardConditionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardConditionInsertRepository
{
    public async Task<PlayerCardConditionDomain> InsertAsync(PlayerCardConditionDomain condition)
    {
        var spanId = correlation.NewSpan();
        var @params = new { condition.Id, condition.PlayerCardId, condition.ConditionName, condition.AssignedAt };
        const string sql =
            @"INSERT INTO player_card_conditions (id, player_card_id, condition_name, assigned_at)
              VALUES (@Id, @PlayerCardId, @ConditionName, @AssignedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_conditions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_conditions", @params, rows);
        return condition;
    }
}
