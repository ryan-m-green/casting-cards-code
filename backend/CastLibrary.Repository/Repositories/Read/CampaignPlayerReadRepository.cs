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
    Task<CampaignPlayerDomain> GetByUserAndCampaignAsync(Guid campaignId, Guid playerUserId);
    Task<Dictionary<Guid, Guid>> GetDemoPlayerAssignmentsAsync();
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
                     cp.joined_at      AS JoinedAt,
                     pc.name           AS PlayerCardName,
                     pc.race           AS PlayerCardRace,
                     pc.class          AS PlayerCardClass
              FROM campaign_players cp
              JOIN users u ON u.id = cp.player_user_id
              LEFT JOIN player_cards pc ON pc.campaign_id = cp.campaign_id AND pc.player_user_id = cp.player_user_id
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

    public async Task<CampaignPlayerDomain> GetByUserAndCampaignAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        const string sql =
            @"SELECT cp.campaign_id   AS CampaignId,
                     cp.player_user_id AS PlayerUserId,
                     u.display_name    AS DisplayName,
                     u.email,
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

    public async Task<Dictionary<Guid, Guid>> GetDemoPlayerAssignmentsAsync()
    {
        var spanId = correlation.NewSpan();
        const string sql =
            @"SELECT cp.player_user_id AS UserId, cp.campaign_id AS CampaignId
              FROM campaign_players cp
              JOIN campaigns c ON c.id = cp.campaign_id
              WHERE c.is_demo = TRUE";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players", null);

        using var conn = sqlConnectionFactory.GetConnection();
        var assignments = (await conn.QueryAsync<(Guid UserId, Guid CampaignId)>(sql))
            .ToDictionary(x => x.UserId, x => x.CampaignId);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_players", null, assignments.Count);

        return assignments;
    }
}
