using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ILocationPlayerNotesReadRepository
{
    Task<CampaignLocationPlayerNotesDomain> GetByLocationInstanceAsync(Guid campaignId, Guid locationInstanceId);
}

public class LocationPlayerNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignLocationPlayerNotesEntityMapper mapper) : ILocationPlayerNotesReadRepository
{
    public async Task<CampaignLocationPlayerNotesDomain> GetByLocationInstanceAsync(Guid campaignId, Guid locationInstanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, LocationInstanceId = locationInstanceId };
        const string sql =
            @"SELECT id,
                     campaign_id          AS CampaignId,
                     location_instance_id AS LocationInstanceId,
                     notes,
                     created_at           AS CreatedAt,
                     updated_at           AS UpdatedAt
              FROM campaign_location_player_notes
              WHERE campaign_id          = @CampaignId
                AND location_instance_id = @LocationInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_player_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignLocationPlayerNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_player_notes",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}
