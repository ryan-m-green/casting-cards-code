using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IFactionReadRepository
{
    Task<List<FactionDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<FactionDomain> GetByIdAsync(Guid factionId);
    Task<int> GetFactionCountByDmAsync(Guid dmUserId);

    /// <summary>
    /// One page of the DM's faction library with this campaign's own factions left out — the
    /// cards the campaign still has to add — filtered by free text (name or type) and/or
    /// keywords, and ordered by name. <c>Total</c> is how many match the filter; the page is one
    /// slice of them. <paramref name="matchAll"/> = true requires every keyword, false any.
    /// </summary>
    Task<(List<FactionDomain> Items, int Total)> GetCampaignLibraryPageAsync(
        Guid dmUserId, Guid campaignId, string searchQuery, string[] keywords, bool matchAll,
        int pageNumber, int pageSize);

    /// <summary>
    /// Keywords carried by the factions in the current filter, each with how many of them carry
    /// it, most used first — the chip row that filters the picker's grid.
    /// </summary>
    Task<List<FactionKeywordCountRow>> GetCampaignLibraryKeywordCountsAsync(
        Guid dmUserId, Guid campaignId, string searchQuery, string[] keywords, bool matchAll);
}

/// <summary>A keyword and how many of the filtered factions carry it (the chip row).</summary>
public class FactionKeywordCountRow
{
    public string Keyword { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class FactionReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IFactionEntityMapper mapper) : IFactionReadRepository
{
    public async Task<List<FactionDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT faction_id AS FactionId, dm_user_id AS DmUserId, name, type,
                     influence, perception, hidden, description, dm_notes AS DmNotes,
                     symbol_path AS SymbolPath, keywords AS Keywords, colors, created_at AS CreatedAt
                FROM factions
               WHERE dm_user_id = @DmUserId
               ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<FactionEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, entities.Count);
        return entities.Select(mapper.ToDomain).ToList();
    }

    public async Task<FactionDomain> GetByIdAsync(Guid factionId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionId = factionId };
        const string sql =
            @"SELECT faction_id AS FactionId, dm_user_id AS DmUserId, name, type,
                     influence, perception, hidden, description, dm_notes AS DmNotes,
                     symbol_path AS SymbolPath, keywords AS Keywords, colors, created_at AS CreatedAt
                FROM factions
               WHERE faction_id = @FactionId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<FactionEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, entity is null ? 0 : 1);
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<int> GetFactionCountByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql = "SELECT COUNT(*) FROM factions WHERE dm_user_id = @DmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var count = await conn.QuerySingleAsync<int>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, count);
        return count;
    }

    /// <summary>
    /// The filter the campaign-library reads share: the DM's own factions, less the ones this
    /// campaign already holds (matched on the library faction the instance was made from),
    /// narrowed by free text against the name or the type and, when any are picked, by keyword —
    /// every one of them (<c>matchAll</c> style) or any of them.
    ///
    /// Keyword matching is case-insensitive on both sides on purpose: a faction keeps its keywords
    /// as the DM typed them, while the chip row's hashtags are stored lower-cased by the keyword
    /// merge, so a plain comparison would never put the two together.
    /// </summary>
    private const string CampaignLibraryFilterSql =
        @"FROM factions f
           WHERE f.dm_user_id = @DmUserId
             AND NOT EXISTS (SELECT 1
                               FROM campaign_faction_instances i
                              WHERE i.campaign_id = @CampaignId
                                AND i.source_faction_id = f.faction_id)
             AND (@SearchLike::text IS NULL
                  OR f.name ILIKE @SearchLike
                  OR f.type ILIKE @SearchLike)
             AND (@Keywords::text[] IS NULL
                  OR (@MatchAll = TRUE
                      AND NOT EXISTS (SELECT 1
                                        FROM unnest(@Keywords::text[]) wanted
                                       WHERE NOT EXISTS (SELECT 1
                                                           FROM unnest(f.keywords) carried
                                                          WHERE lower(carried) = lower(wanted))))
                  OR (@MatchAll = FALSE
                      AND EXISTS (SELECT 1
                                    FROM unnest(@Keywords::text[]) wanted
                                    JOIN LATERAL unnest(f.keywords) carried
                                      ON lower(carried) = lower(wanted))))";

    public async Task<(List<FactionDomain> Items, int Total)> GetCampaignLibraryPageAsync(
        Guid dmUserId, Guid campaignId, string searchQuery, string[] keywords, bool matchAll,
        int pageNumber, int pageSize)
    {
        var spanId = correlation.NewSpan();
        var search = string.IsNullOrWhiteSpace(searchQuery) ? null : searchQuery.Trim();
        var @params = new
        {
            DmUserId = dmUserId,
            CampaignId = campaignId,
            SearchLike = search is null ? null : $"%{search}%",
            Keywords = keywords.Length == 0 ? null : keywords,
            MatchAll = matchAll,
            PageSize = pageSize,
            Offset = (pageNumber - 1) * pageSize,
        };

        var sql =
            $@"SELECT f.faction_id AS FactionId, f.dm_user_id AS DmUserId, f.name, f.type,
                      f.influence, f.perception, f.hidden, f.description, f.dm_notes AS DmNotes,
                      f.symbol_path AS SymbolPath, f.keywords AS Keywords, f.colors, f.created_at AS CreatedAt
                 {CampaignLibraryFilterSql}
                ORDER BY f.name
                LIMIT @PageSize OFFSET @Offset";

        var countSql = $@"SELECT COUNT(*) {CampaignLibraryFilterSql}";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<FactionEntity>(sql, @params)).ToList();
        var total = await conn.QuerySingleAsync<int>(countSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions", @params, entities.Count);
        return (entities.Select(mapper.ToDomain).ToList(), total);
    }

    public async Task<List<FactionKeywordCountRow>> GetCampaignLibraryKeywordCountsAsync(
        Guid dmUserId, Guid campaignId, string searchQuery, string[] keywords, bool matchAll)
    {
        var spanId = correlation.NewSpan();
        var search = string.IsNullOrWhiteSpace(searchQuery) ? null : searchQuery.Trim();
        var @params = new
        {
            DmUserId = dmUserId,
            CampaignId = campaignId,
            SearchLike = search is null ? null : $"%{search}%",
            Keywords = keywords.Length == 0 ? null : keywords,
            MatchAll = matchAll,
        };

        var sql =
            $@"SELECT lower(keyword) AS Keyword, COUNT(*) AS Count
                 FROM (SELECT unnest(f.keywords) AS keyword
                         {CampaignLibraryFilterSql}) k
                GROUP BY lower(keyword)
                ORDER BY COUNT(*) DESC, lower(keyword)
                LIMIT 60";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions.keywords", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<FactionKeywordCountRow>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "factions.keywords", @params, rows.Count);
        return rows;
    }
}
