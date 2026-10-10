using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

/// <summary>
/// Light projection used by the encounter builder's paged cast index: only the
/// fields a picker tile needs (no descriptions, voice notes or uploads), so a
/// page of 25 stays cheap to fetch.
/// </summary>
public class CastIndexRow
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string[] Keywords { get; set; } = [];
}

public class CastKeywordCountRow
{
    public string Keyword { get; set; } = string.Empty;
    public int Count { get; set; }
}

public interface ICastReadRepository
{
    Task<List<CastDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<CastDomain> GetByIdAsync(Guid id);
    Task<int> GetCastCountByDmAsync(Guid dmUserId);

    /// <summary>
    /// One page of the DM's cast library, filtered by free text and/or keywords.
    /// <paramref name="matchAll"/> = true requires every keyword, false requires any.
    /// </summary>
    Task<(List<CastIndexRow> Items, int Total)> GetIndexPageByDmAsync(
        Guid dmUserId, string searchQuery, string[] keywords, bool matchAll, int pageNumber, int pageSize);

    /// <summary>
    /// Keyword counts for the current filter (the chip row's "grouping"), most
    /// used first.
    /// </summary>
    Task<List<CastKeywordCountRow>> GetKeywordCountsByDmAsync(
        Guid dmUserId, string searchQuery, string[] keywords, bool matchAll);
}

public class CastReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICastEntityMapper mapper) : ICastReadRepository
{

    public async Task<List<CastDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, pronouns, race, role, age, max_hit_points AS MaxHitPoints, posture, speed,
                     keywords AS Keywords, voice_notes AS VoiceNotes,
                     description, public_description AS PublicDescription,
                     created_at AS CreatedAt
                FROM casts
                WHERE dm_user_id = @DmUserId ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entities = (await conn.QueryAsync<CastEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params, entities.Count);
        return entities.Select(o => mapper.ToDomain(o)).ToList();
    }

    public async Task<CastDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, dm_user_id AS DmUserId, name, pronouns, race, role, age, max_hit_points AS MaxHitPoints, posture, speed,
                     keywords AS Keywords, voice_notes AS VoiceNotes,
                     description, public_description AS PublicDescription,
                     created_at AS CreatedAt
                FROM casts
                WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CastEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params,
            entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<int> GetCastCountByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql = "SELECT COUNT(*) FROM casts WHERE dm_user_id = @DmUserId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var count = await conn.QuerySingleAsync<int>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params, count);
        return count;
    }

    // Shared filter: free text across name/role/race/keywords + keyword matching
    // (overlap = any, contains = all). @Keywords is null when no keyword is selected.
    // The ::text / ::text[] casts are load-bearing: a null array (or any value Npgsql
    // cannot type from the CLR value) is sent untyped, and Postgres cannot infer a
    // type from a bare "@Keywords IS NULL" — it fails with 42P08 (parameter $4).
    private const string IndexFilterSql =
        @"WHERE dm_user_id = @DmUserId
              AND (@SearchQuery::text IS NULL
                   OR name ILIKE @SearchLike
                   OR role ILIKE @SearchLike
                   OR race ILIKE @SearchLike
                   OR EXISTS (SELECT 1 FROM unnest(keywords) k WHERE k ILIKE @SearchLike))
              AND (@Keywords::text[] IS NULL
                   OR (@MatchAll = TRUE  AND keywords @> @Keywords::text[])
                   OR (@MatchAll = FALSE AND keywords && @Keywords::text[]))";

    public async Task<(List<CastIndexRow> Items, int Total)> GetIndexPageByDmAsync(
        Guid dmUserId, string searchQuery, string[] keywords, bool matchAll, int pageNumber, int pageSize)
    {
        var spanId = correlation.NewSpan();
        var search = string.IsNullOrWhiteSpace(searchQuery) ? null : searchQuery.Trim();
        var @params = new
        {
            DmUserId = dmUserId,
            SearchQuery = search,
            SearchLike = search is null ? null : $"%{search}%",
            Keywords = keywords.Length == 0 ? null : keywords,
            MatchAll = matchAll,
            PageSize = pageSize,
            Offset = (pageNumber - 1) * pageSize,
        };

        var sql =
            $@"SELECT id, dm_user_id AS DmUserId, name, role, race, keywords AS Keywords
               FROM casts
               {IndexFilterSql}
               ORDER BY name
               LIMIT @PageSize OFFSET @Offset";

        var countSql = $@"SELECT COUNT(*) FROM casts {IndexFilterSql}";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var items = (await conn.QueryAsync<CastIndexRow>(sql, @params)).ToList();
        var total = await conn.QuerySingleAsync<int>(countSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts", @params, items.Count);
        return (items, total);
    }

    public async Task<List<CastKeywordCountRow>> GetKeywordCountsByDmAsync(
        Guid dmUserId, string searchQuery, string[] keywords, bool matchAll)
    {
        var spanId = correlation.NewSpan();
        var search = string.IsNullOrWhiteSpace(searchQuery) ? null : searchQuery.Trim();
        var @params = new
        {
            DmUserId = dmUserId,
            SearchQuery = search,
            SearchLike = search is null ? null : $"%{search}%",
            Keywords = keywords.Length == 0 ? null : keywords,
            MatchAll = matchAll,
        };

        var sql =
            $@"SELECT keyword AS Keyword, COUNT(*) AS Count
               FROM (SELECT unnest(keywords) AS keyword FROM casts {IndexFilterSql}) k
               GROUP BY keyword
               ORDER BY COUNT(*) DESC, keyword
               LIMIT 60";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts.keywords", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<CastKeywordCountRow>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "casts.keywords", @params, rows.Count);
        return rows;
    }
}
