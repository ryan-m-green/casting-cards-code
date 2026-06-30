using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;
using System.Text.Json;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignSessionChroniclesInsertRepository
{
    Task<CampaignSessionChroniclesDomain> InsertAsync(CampaignSessionChroniclesDomain domain);
}

public class CampaignSessionChroniclesInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignSessionChroniclesInsertRepository
{
    public async Task<CampaignSessionChroniclesDomain> InsertAsync(CampaignSessionChroniclesDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var linkedEntitiesJson = CampaignEventEntityMapper.ToJson(domain.LinkedEntities);

        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.ArchivedSessionId,
            domain.Title,
            domain.Body,
            domain.SortOrder,
            LinkedEntities = linkedEntitiesJson,
            domain.IsGmOnly,
            domain.FilePath,
            domain.TodSliceName,
            domain.ArchivedAt,
            domain.CreatedAt,
            domain.UpdatedAt,
            Keywords = JsonSerializer.Serialize(domain.Keywords)
        };

        const string sql =
            @"INSERT INTO campaign_session_chronicles
                (id, campaign_id, archived_session_id, title, body, sort_order, linked_entities, file_path, tod_slice_name, is_gm_only, archived_at, created_at, updated_at, keywords)
              VALUES
                (@Id, @CampaignId, @ArchivedSessionId, @Title, @Body, @SortOrder, @LinkedEntities::jsonb, @FilePath, @TodSliceName, @IsGmOnly, @ArchivedAt, @CreatedAt, @UpdatedAt, @Keywords)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_session_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_session_chronicles", @params, 1);
        return domain;
    }
}
