using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;
using System.Text.Json;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignChroniclesFeedReadRepository
{
    Task<List<CampaignChroniclesDomain>> GetByCampaignIdAsync(
        Guid campaignId,
        bool includeGmOnly,
        string[]? contentTypes,
        int limit);
}

/// <summary>
/// Reads the v2 standalone campaign_chronicles feed, newest played date first.
/// </summary>
public class CampaignChroniclesFeedReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignChroniclesFeedReadRepository
{
    public async Task<List<CampaignChroniclesDomain>> GetByCampaignIdAsync(
        Guid campaignId,
        bool includeGmOnly,
        string[] contentTypes,
        int limit)
    {
        var spanId = correlation.NewSpan();

        var effectiveLimit = limit > 0 ? limit : 1000;

        // Only add the content-type predicate when it is actually used. A parameter that
        // appears solely in an "IS NULL" test cannot be typed by Postgres, which raises
        // "42P08: could not determine data type of parameter $3" at parse time.
        var typeClause = contentTypes is { Length: > 0 }
            ? "AND content_type = ANY(@ContentTypes)"
            : string.Empty;

        var sql =
            $@"SELECT id,
                     campaign_id     AS CampaignId,
                     content_type    AS ContentType,
                     source_id       AS SourceId,
                     title,
                     body,
                     sort_order      AS SortOrder,
                     linked_entities AS LinkedEntities,
                     file_path       AS FilePath,
                     tod_slice_name  AS TodSliceName,
                     is_gm_only      AS IsGmOnly,
                     played_on       AS PlayedOn,
                     session_number  AS SessionNumber,
                     archived_at     AS ArchivedAt,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt,
                     keywords
              FROM campaign_chronicles
              WHERE campaign_id = @CampaignId
                AND (@IncludeGmOnly = TRUE OR is_gm_only = FALSE)
                {typeClause}
              ORDER BY played_on DESC, archived_at DESC, created_at DESC
              LIMIT @Limit";

        var @params = new
        {
            CampaignId = campaignId,
            IncludeGmOnly = includeGmOnly,
            ContentTypes = contentTypes is { Length: > 0 } ? contentTypes : null,
            Limit = effectiveLimit
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CampaignChroniclesEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_chronicles", @params, rows.Count);

        return rows.Select(ToDomain).ToList();
    }

    private static CampaignChroniclesDomain ToDomain(CampaignChroniclesEntity entity) => new()
    {
        Id = entity.Id,
        CampaignId = entity.CampaignId,
        ContentType = entity.ContentType,
        SourceId = entity.SourceId,
        Title = entity.Title,
        Body = entity.Body,
        SortOrder = entity.SortOrder,
        LinkedEntities = string.IsNullOrWhiteSpace(entity.LinkedEntities)
            ? []
            : JsonSerializer.Deserialize<List<LinkedEntityTrigger>>(entity.LinkedEntities) ?? [],
        FilePath = entity.FilePath,
        TodSliceName = entity.TodSliceName,
        IsGmOnly = entity.IsGmOnly,
        PlayedOn = entity.PlayedOn.ToDateTime(TimeOnly.MinValue),
        SessionNumber = entity.SessionNumber,
        ArchivedAt = entity.ArchivedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
        Keywords = string.IsNullOrWhiteSpace(entity.Keywords)
            ? []
            : JsonSerializer.Deserialize<string[]>(entity.Keywords) ?? []
    };
}
