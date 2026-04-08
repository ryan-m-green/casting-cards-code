using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ILocationPoliticalNotesReadRepository
{
    Task<LocationPoliticalNotesDomain> GetByLocationInstanceAsync(Guid campaignId, Guid LocationInstanceId);
}

public class LocationPoliticalNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ILocationPoliticalNotesEntityMapper mapper) : ILocationPoliticalNotesReadRepository
{
    public async Task<LocationPoliticalNotesDomain> GetByLocationInstanceAsync(Guid campaignId, Guid LocationInstanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, LocationInstanceId = LocationInstanceId };

        const string sql =
            @"SELECT id,
                     campaign_id           AS CampaignId,
                     location_instance_id  AS LocationInstanceId,
                     general_notes         AS GeneralNotes,
                     factions,
                     relationships,
                     npc_roles             AS NpcRoles,
                     created_at            AS CreatedAt,
                     updated_at            AS UpdatedAt
              FROM location_political_notes
              WHERE campaign_id            = @CampaignId
                AND location_instance_id   = @LocationInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "location_political_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<LocationPoliticalNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "location_political_notes", @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}


