using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignPlayerReadRepository
{
    Task<List<CampaignPlayerDomain>> GetByCampaignAsync(Guid campaignId);
    Task<bool> IsPlayerInCampaignAsync(Guid campaignId, Guid playerUserId);
    Task<CampaignPlayerDomain?> GetByUserAndCampaignAsync(Guid campaignId, Guid playerUserId);
}

public class CampaignPlayerReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignPlayerEntityMapper mapper) : ICampaignPlayerReadRepository
{

    public async Task<List<CampaignPlayerDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT cp.campaign_id   AS CampaignId,
                     cp.player_user_id AS PlayerUserId,
                     u.display_name    AS DisplayName,
                     u.email,
                     cp.starting_gold  AS StartingGold,
                     cp.joined_at      AS JoinedAt
              FROM campaign_players cp
              JOIN users u ON u.id = cp.player_user_id
              WHERE cp.campaign_id = @CampaignId
              ORDER BY cp.joined_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<CampaignPlayerEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players",
            @params, entities.Count);

        return entities.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<bool> IsPlayerInCampaignAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT COUNT(1) FROM campaign_players
              WHERE campaign_id = @CampaignId AND player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var count = await conn.ExecuteScalarAsync<int>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players", @params, count);

        return count > 0;
    }

    public async Task<CampaignPlayerDomain?> GetByUserAndCampaignAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT cp.campaign_id   AS CampaignId,
                     cp.player_user_id AS PlayerUserId,
                     u.display_name    AS DisplayName,
                     u.email,
                     cp.starting_gold  AS StartingGold,
                     cp.joined_at      AS JoinedAt
              FROM campaign_players cp
              JOIN users u ON u.id = cp.player_user_id
              WHERE cp.campaign_id = @CampaignId AND cp.player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CampaignPlayerEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players",
            @params, entity is not null ? 1 : 0);

        return entity is not null ? mapper.ToDomain(entity) : null;
    }
}
