using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Responses;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignChroniclesReadRepository
{
    Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesPagedByFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string[] typeFilters, bool isPlayer);
    Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesPagedBySearchAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, bool isPlayer);
    Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesPagedBySearchAndFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, string[] typeFilters, bool isPlayer);
    Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesSessionsPagedByFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string[] typeFilters, bool isPlayer);
    Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesSessionsPagedBySearchAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, bool isPlayer);
    Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesSessionsPagedBySearchAndFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, string[] typeFilters, bool isPlayer);
    Task<IEnumerable<SessionRowEntity>> GetSessionsListAsync(Guid campaignId);
    Task<string> GetLinkedEntitiesAsync(Guid chronicleId);
    Task<IEnumerable<CampaignSessionChroniclesEntity>> GetChroniclesByArchivedSessionIdAsync(Guid archivedSessionId);
}

public class CampaignChroniclesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignChroniclesReadRepository
{
    public async Task<IEnumerable<SessionRowEntity>> GetSessionsListAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        const string sql =
            @"SELECT s.id as SessionId,
                     s.session_number as SessionNumber,
                     s.title as Title,
                     s.alternate_title as AlternateTitle,
                     s.start_time as StartTime,
                     s.in_game_days as InGameDays,
                     COUNT(c.id) as ChronicleCount
              FROM campaign_session_archived s
              LEFT JOIN campaign_session_chronicles c ON c.archived_session_id = s.id
              WHERE s.campaign_id = @CampaignId
              GROUP BY s.id, s.session_number, s.title, s.alternate_title, s.start_time, s.in_game_days
              ORDER BY s.archived_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.QueryAsync<SessionRowEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived", @params, rows.Count());

        return rows;
    }

    public async Task<string> GetLinkedEntitiesAsync(Guid chronicleId)
    {
        var spanId = correlation.NewSpan();
        const string sql = "SELECT linked_entities FROM campaign_session_chronicles WHERE id = @ChronicleId";
        var @params = new { ChronicleId = chronicleId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QuerySingleOrDefaultAsync<string>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_chronicles", @params, 1);

        return result ?? "[]";
    }

    public async Task<IEnumerable<CampaignSessionChroniclesEntity>> GetChroniclesByArchivedSessionIdAsync(Guid archivedSessionId)
    {
        var spanId = correlation.NewSpan();
        const string sql = "SELECT * FROM campaign_session_chronicles WHERE archived_session_id = @ArchivedSessionId";
        var @params = new { ArchivedSessionId = archivedSessionId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryAsync<CampaignSessionChroniclesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_chronicles", @params, result.Count());

        return result;
    }

    public async Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesPagedByFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string[] typeFilters, bool isPlayer)
    {
        var spanId = correlation.NewSpan();
        var offset = (pageNumber - 1) * pageSize;

        var @params = new
        {
            CampaignId = campaignId,
            Offset = offset,
            PageSize = pageSize,
            TypeFilters = typeFilters
        };

        var gmOnlyClause = isPlayer ? "AND c.is_gm_only = FALSE" : string.Empty;
        var whereClause = typeFilters == null || typeFilters.Length == 0 
            ? string.Empty 
            : "AND c.linked_entities IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.linked_entities) as item WHERE item->>'EntityType' = ANY(@TypeFilters))";

        var countSql = BuildCountSql(whereClause, gmOnlyClause);
        var dataSql = BuildDataSql(whereClause, gmOnlyClause);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (filters only)", @params);

        using var conn = sqlConnectionFactory.GetConnection();

        var counts = await conn.QuerySingleAsync<(int TotalSessions, int TotalChronicles)>(countSql, @params);
        var rows = await conn.QueryAsync<ChroniclesRowEntity>(dataSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (filters only)", @params, rows.Count());

        return (rows, counts);
    }

    public async Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesPagedBySearchAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, bool isPlayer)
    {
        var spanId = correlation.NewSpan();
        var offset = (pageNumber - 1) * pageSize;

        var @params = new
        {
            CampaignId = campaignId,
            Offset = offset,
            PageSize = pageSize,
            SearchQuery = searchQuery
        };

        var gmOnlyClause = isPlayer ? "AND c.is_gm_only = FALSE" : string.Empty;
        var whereClause = "AND (c.title ILIKE '%' || @SearchQuery || '%' OR c.body ILIKE '%' || @SearchQuery || '%')";

        var countSql = BuildCountSql(whereClause, gmOnlyClause);
        var dataSql = BuildDataSql(whereClause, gmOnlyClause);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (search only)", @params);

        using var conn = sqlConnectionFactory.GetConnection();

        var counts = await conn.QuerySingleAsync<(int TotalSessions, int TotalChronicles)>(countSql, @params);
        var rows = await conn.QueryAsync<ChroniclesRowEntity>(dataSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (search only)", @params, rows.Count());

        return (rows, counts);
    }

    public async Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesPagedBySearchAndFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, string[] typeFilters, bool isPlayer)
    {
        var spanId = correlation.NewSpan();
        var offset = (pageNumber - 1) * pageSize;

        var @params = new
        {
            CampaignId = campaignId,
            Offset = offset,
            PageSize = pageSize,
            SearchQuery = searchQuery,
            TypeFilters = typeFilters
        };

        var gmOnlyClause = isPlayer ? "AND c.is_gm_only = FALSE" : string.Empty;
        var filterClause = typeFilters == null || typeFilters.Length == 0 
            ? string.Empty 
            : "AND c.linked_entities IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.linked_entities) as item WHERE item->>'EntityType' = ANY(@TypeFilters))";
        var whereClause = filterClause + " AND (c.title ILIKE '%' || @SearchQuery || '%' OR c.body ILIKE '%' || @SearchQuery || '%')";

        var countSql = BuildCountSql(whereClause, gmOnlyClause);
        var dataSql = BuildDataSql(whereClause, gmOnlyClause);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (search + filters)", @params);

        using var conn = sqlConnectionFactory.GetConnection();

        var counts = await conn.QuerySingleAsync<(int TotalSessions, int TotalChronicles)>(countSql, @params);
        var rows = await conn.QueryAsync<ChroniclesRowEntity>(dataSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (search + filters)", @params, rows.Count());

        return (rows, counts);
    }

    public async Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesSessionsPagedByFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string[] typeFilters, bool isPlayer)
    {
        var spanId = correlation.NewSpan();
        var offset = (pageNumber - 1) * pageSize;

        var @params = new
        {
            CampaignId = campaignId,
            Offset = offset,
            PageSize = pageSize,
            TypeFilters = typeFilters
        };

        var gmOnlyClause = isPlayer ? "AND c.is_gm_only = FALSE" : string.Empty;
        var whereClause = typeFilters == null || typeFilters.Length == 0 
            ? string.Empty 
            : "AND c.linked_entities IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.linked_entities) as item WHERE item->>'EntityType' = ANY(@TypeFilters))";

        var countSql = BuildCountSql(whereClause, gmOnlyClause);
        var dataSql = BuildDataSql(whereClause, gmOnlyClause);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (session-paginated, filters only)", @params);

        using var conn = sqlConnectionFactory.GetConnection();

        var counts = await conn.QuerySingleAsync<(int TotalSessions, int TotalChronicles)>(countSql, @params);
        var rows = await conn.QueryAsync<ChroniclesRowEntity>(dataSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (session-paginated, filters only)", @params, rows.Count());

        return (rows, counts);
    }

    public async Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesSessionsPagedBySearchAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, bool isPlayer)
    {
        var spanId = correlation.NewSpan();
        var offset = (pageNumber - 1) * pageSize;

        var @params = new
        {
            CampaignId = campaignId,
            Offset = offset,
            PageSize = pageSize,
            SearchQuery = searchQuery
        };

        var gmOnlyClause = isPlayer ? "AND c.is_gm_only = FALSE" : string.Empty;
        var whereClause = "AND (c.title ILIKE '%' || @SearchQuery || '%' OR c.body ILIKE '%' || @SearchQuery || '%')";

        var countSql = BuildCountSql(whereClause, gmOnlyClause);
        var dataSql = BuildDataSql(whereClause, gmOnlyClause);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (session-paginated, search only)", @params);

        using var conn = sqlConnectionFactory.GetConnection();

        var counts = await conn.QuerySingleAsync<(int TotalSessions, int TotalChronicles)>(countSql, @params);
        var rows = await conn.QueryAsync<ChroniclesRowEntity>(dataSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (session-paginated, search only)", @params, rows.Count());

        return (rows, counts);
    }

    public async Task<(IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts)> GetChroniclesSessionsPagedBySearchAndFiltersAsync(Guid campaignId, int pageNumber, int pageSize, string searchQuery, string[] typeFilters, bool isPlayer)
    {
        var spanId = correlation.NewSpan();
        var offset = (pageNumber - 1) * pageSize;

        var @params = new
        {
            CampaignId = campaignId,
            Offset = offset,
            PageSize = pageSize,
            SearchQuery = searchQuery,
            TypeFilters = typeFilters
        };

        var gmOnlyClause = isPlayer ? "AND c.is_gm_only = FALSE" : string.Empty;
        var filterClause = typeFilters == null || typeFilters.Length == 0 
            ? string.Empty 
            : "AND c.linked_entities IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.linked_entities) as item WHERE item->>'EntityType' = ANY(@TypeFilters))";
        var whereClause = filterClause + " AND (c.title ILIKE '%' || @SearchQuery || '%' OR c.body ILIKE '%' || @SearchQuery || '%')";

        var countSql = BuildCountSql(whereClause, gmOnlyClause);
        var dataSql = BuildDataSql(whereClause, gmOnlyClause);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (session-paginated, search + filters)", @params);

        using var conn = sqlConnectionFactory.GetConnection();

        var counts = await conn.QuerySingleAsync<(int TotalSessions, int TotalChronicles)>(countSql, @params);
        var rows = await conn.QueryAsync<ChroniclesRowEntity>(dataSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_session_archived + chronicles (session-paginated, search + filters)", @params, rows.Count());

        return (rows, counts);
    }

    private string BuildCountSql(string whereClause, string gmOnlyClause)
    {
        return $"SELECT COUNT(DISTINCT s.id) as TotalSessions,\n" +
               $"         COUNT(c.id) as TotalChronicles\n" +
               $"  FROM campaign_session_archived s\n" +
               $"  INNER JOIN campaign_session_chronicles c ON c.archived_session_id = s.id\n" +
               $"  WHERE s.campaign_id = @CampaignId\n" +
               $"    {whereClause}\n" +
               $"    {gmOnlyClause}";
    }

    private string BuildDataSql(string whereClause, string gmOnlyClause)
    {
        return $"WITH matching_sessions AS (\n" +
               $"    SELECT DISTINCT s.id, s.start_time\n" +
               $"    FROM campaign_session_archived s\n" +
               $"    INNER JOIN campaign_session_chronicles c ON c.archived_session_id = s.id\n" +
               $"    WHERE s.campaign_id = @CampaignId\n" +
               $"      {whereClause}\n" +
               $"      {gmOnlyClause}\n" +
               $"    ORDER BY s.start_time DESC\n" +
               $"    LIMIT @PageSize OFFSET @Offset\n" +
               $"  )\n" +
               $"  SELECT s.id as SessionId,\n" +
               $"         s.session_number as SessionNumber,\n" +
               $"         s.title as Title,\n" +
               $"         s.alternate_title as AlternateTitle,\n" +
               $"         s.start_time as StartTime,\n" +
               $"         s.in_game_days as InGameDays,\n" +
               $"         COUNT(c.id) OVER (PARTITION BY s.id) as ChronicleCount,\n" +
               $"         c.id as ChronicleId,\n" +
               $"         c.title as ChronicleTitle,\n" +
               $"         c.body as ChronicleBody,\n" +
               $"         c.linked_entities as LinkedEntities,\n" +
               $"         c.file_path as FilePath,\n" +
               $"         c.tod_slice_name as TodSliceName,\n" +
               $"         c.is_gm_only as IsGmOnly,\n" +
               $"         c.archived_at as ArchivedAt\n" +
               $"  FROM campaign_session_archived s\n" +
               $"  INNER JOIN matching_sessions ms ON ms.id = s.id\n" +
               $"  LEFT JOIN campaign_session_chronicles c ON c.archived_session_id = s.id {gmOnlyClause}\n" +
               $"  WHERE s.campaign_id = @CampaignId\n" +
               $"    {whereClause}\n" +
               $"  ORDER BY s.start_time DESC, c.sort_order ASC";
    }
}
