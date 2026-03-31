using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICityPoliticalNotesReadRepository
{
    Task<CityPoliticalNotesDomain> GetByCityInstanceAsync(Guid campaignId, Guid cityInstanceId);
}

public class CityPoliticalNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICityPoliticalNotesEntityMapper mapper) : ICityPoliticalNotesReadRepository
{
    public async Task<CityPoliticalNotesDomain> GetByCityInstanceAsync(Guid campaignId, Guid cityInstanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, CityInstanceId = cityInstanceId };

        const string sql =
            @"SELECT id,
                     campaign_id       AS CampaignId,
                     city_instance_id  AS CityInstanceId,
                     general_notes     AS GeneralNotes,
                     factions,
                     relationships,
                     npc_roles         AS NpcRoles,
                     created_at        AS CreatedAt,
                     updated_at        AS UpdatedAt
              FROM city_political_notes
              WHERE campaign_id      = @CampaignId
                AND city_instance_id = @CityInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "city_political_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CityPoliticalNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "city_political_notes", @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}
