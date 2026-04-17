using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerCardReadRepository
{
    Task<PlayerCardDomain?> GetByIdAsync(Guid id);
    Task<PlayerCardDomain?> GetByCampaignAndPlayerAsync(Guid campaignId, Guid playerUserId);
    Task<List<PlayerCardDomain>> GetByCampaignAsync(Guid campaignId);
}

public class PlayerCardReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IPlayerCardEntityMapper mapper) : IPlayerCardReadRepository
{
    private const string SelectColumns =
        @"pc.id, pc.campaign_id as CampaignId, pc.player_user_id as PlayerUserId,
          pc.name, pc.race, pc.class, pc.description,
          pc.created_at as CreatedAt, pc.updated_at as UpdatedAt";

    private const string FromJoin =
        @"FROM player_cards pc";

    public async Task<PlayerCardDomain?> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        var sql = $"SELECT {SelectColumns} {FromJoin} WHERE pc.id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cards", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PlayerCardEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cards", @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<PlayerCardDomain?> GetByCampaignAndPlayerAsync(Guid campaignId, Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
        var sql = $"SELECT {SelectColumns} {FromJoin} WHERE pc.campaign_id = @CampaignId AND pc.player_user_id = @PlayerUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cards", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PlayerCardEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cards", @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<List<PlayerCardDomain>> GetByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        var sql = $"SELECT {SelectColumns} {FromJoin} WHERE pc.campaign_id = @CampaignId ORDER BY pc.created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cards", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<PlayerCardEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_cards", @params, entities.Count);

        return entities.Select(mapper.ToDomain).ToList();
    }
}
