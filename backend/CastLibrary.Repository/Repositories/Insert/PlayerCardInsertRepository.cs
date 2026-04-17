using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCardInsertRepository
{
    Task<PlayerCardDomain> InsertAsync(PlayerCardDomain card);
}

public class PlayerCardInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardInsertRepository
{
    public async Task<PlayerCardDomain> InsertAsync(PlayerCardDomain card)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            card.Id,
            card.CampaignId,
            card.PlayerUserId,
            card.Name,
            card.Race,
            card.Class,
            card.Description,
            card.CreatedAt,
            card.UpdatedAt,
        };
        const string sql =
            @"INSERT INTO player_cards
                (id, campaign_id, player_user_id, name, race, class, description, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @PlayerUserId, @Name, @Race, @Class, @Description, @CreatedAt, @UpdatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_cards", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_cards", @params, rows);
        return card;
    }
}
