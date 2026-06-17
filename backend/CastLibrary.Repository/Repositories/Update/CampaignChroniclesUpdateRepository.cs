using System.Text.Json;
using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignChroniclesUpdateRepository
{
    Task<bool> UpdateAsync(Guid chronicleId, string title, string body, Guid sessionId, int sortOrder, string[] keywords);
    Task<bool> UpdateKeywordsAsync(Guid chronicleId, string[] keywords);
}

public class CampaignChroniclesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignChroniclesUpdateRepository
{
    public async Task<bool> UpdateAsync(Guid chronicleId, string title, string body, Guid sessionId, int sortOrder, string[] keywords)
    {
        var spanId = correlation.NewSpan();
        
        var @params = new { ChronicleId = chronicleId, Title = title, Body = body, SessionId = sessionId, SortOrder = sortOrder, Keywords = JsonSerializer.Serialize(keywords) };

        const string sql =
            @"UPDATE campaign_session_chronicles
              SET title = @Title,
                  body = @Body,
                  archived_session_id = @SessionId,
                  sort_order = @SortOrder,
                  keywords = @Keywords,
                  updated_at = NOW()
              WHERE id = @ChronicleId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_session_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_session_chronicles", @params, rows);

        return rows > 0;
    }

    public async Task<bool> UpdateKeywordsAsync(Guid chronicleId, string[] keywords)
    {
        var spanId = correlation.NewSpan();
        
        var @params = new { ChronicleId = chronicleId, Keywords = JsonSerializer.Serialize(keywords) };

        const string sql =
            @"UPDATE campaign_session_chronicles
              SET keywords = @Keywords,
                  updated_at = NOW()
              WHERE id = @ChronicleId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_session_chronicles", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_session_chronicles", @params, rows);

        return rows > 0;
    }
}
