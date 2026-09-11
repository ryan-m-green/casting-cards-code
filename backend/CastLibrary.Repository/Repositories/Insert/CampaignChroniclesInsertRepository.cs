using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;
using System.Text.Json;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignChroniclesInsertRepository
{
    Task<CampaignChroniclesDomain> InsertAsync(CampaignChroniclesDomain domain);
}

/// <summary>Inserts into the v2 standalone campaign_chronicles feed table.</summary>
public class CampaignChroniclesInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignChroniclesInsertRepository
{
    public async Task<CampaignChroniclesDomain> InsertAsync(CampaignChroniclesDomain domain)
    {
        var spanId = correlation.NewSpan();
        var linkedEntitiesJson = CampaignEventEntityMapper.ToJson(domain.LinkedEntities);

        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.ContentType,
            domain.SourceId,
            domain.Title,
            domain.Body,
            domain.SortOrder,
            LinkedEntities = linkedEntitiesJson,
            domain.FilePath,
            domain.TodSliceName,
            domain.IsGmOnly,
            domain.PlayedOn,
            domain.SessionNumber,
            domain.ArchivedAt,
            domain.CreatedAt,
            domain.UpdatedAt,
            Keywords = JsonSerializer.Serialize(domain.Keywords)
        };

        const string sql =
            @"INSERT INTO campaign_chronicles
                (id, campaign_id, content_type, source_id, title, body, sort_order, linked_entities, file_path, tod_slice_name, is_gm_only, played_on, session_number, archived_at, created_at, updated_at, keywords)
              VALUES
                (@Id, @CampaignId, @ContentType, @SourceId, @Title, @Body, @SortOrder, @LinkedEntities::jsonb, @FilePath, @TodSliceName, @IsGmOnly, @PlayedOn, @SessionNumber, @ArchivedAt, @CreatedAt, @UpdatedAt, @Keywords)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_chronicles", @params, 1);
        return domain;
    }
}
