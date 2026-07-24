using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCampaignInventoryReadRepository
{
    Task<PlayerCampaignInventoryEntity> GetByIdAsync(Guid id);
    Task<PlayerCampaignInventoryEntity> GetByCampaignPlayerAndNameAsync(Guid campaignId, Guid playerUserId, string name);
    Task<List<PlayerCampaignInventoryEntity>> GetByCampaignAndPlayerAsync(Guid campaignId, Guid playerUserId);
}

public class PlayerCampaignInventoryReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCampaignInventoryReadRepository
{
    public async Task<PlayerCampaignInventoryEntity> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id as Id, campaign_id as CampaignId, player_user_id as PlayerUserId, name as Name, description as Description, count as Count
              FROM player_campaign_inventory
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryFirstOrDefaultAsync<PlayerCampaignInventoryEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_campaign_inventory", @params, result is not null ? 1 : 0);
        if (result is null)
            throw new InvalidOperationException($"Inventory item with ID {id} not found");
        return result;
    }

    public async Task<PlayerCampaignInventoryEntity> GetByCampaignPlayerAndNameAsync(Guid campaignId, Guid playerUserId, string name)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId, Name = name };
        const string sql =
            @"SELECT id as Id, campaign_id as CampaignId, player_user_id as PlayerUserId, name as Name, description as Description, count as Count
              FROM player_campaign_inventory
              WHERE campaign_id = @CampaignId AND player_user_id = @PlayerUserId AND name = @Name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryFirstOrDefaultAsync<PlayerCampaignInventoryEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_campaign_inventory", @params, result is not null ? 1 : 0);
        if (result is null)
            throw new InvalidOperationException($"Inventory item '{name}' not found for campaign {campaignId} and player {playerUserId}");
        return result;
    }

    public async Task<List<PlayerCampaignInventoryEntity>> GetByCampaignAndPlayerAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT id as Id, campaign_id as CampaignId, player_user_id as PlayerUserId, name as Name, description as Description, count as Count
              FROM player_campaign_inventory
              WHERE campaign_id = @CampaignId AND player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_campaign_inventory", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = (await conn.QueryAsync<PlayerCampaignInventoryEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_campaign_inventory", @params, result.Count);
        return result;
    }
}
