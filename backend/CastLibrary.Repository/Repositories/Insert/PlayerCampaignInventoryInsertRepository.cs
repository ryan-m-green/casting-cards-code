using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCampaignInventoryInsertRepository
{
    Task<PlayerCampaignInventoryDomain> InsertAsync(PlayerCampaignInventoryDomain inventory);
}

public class PlayerCampaignInventoryInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCampaignInventoryInsertRepository
{
    public async Task<PlayerCampaignInventoryDomain> InsertAsync(PlayerCampaignInventoryDomain inventory)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            inventory.Id,
            inventory.CampaignId,
            inventory.PlayerUserId,
            inventory.Name,
            inventory.Description,
            inventory.Count,
        };
        const string sql =
            @"INSERT INTO player_campaign_inventory
                (id, campaign_id, player_user_id, name, description, count)
              VALUES
                (@Id, @CampaignId, @PlayerUserId, @Name, @Description, @Count)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_campaign_inventory", @params, rows);
        return inventory;
    }
}
