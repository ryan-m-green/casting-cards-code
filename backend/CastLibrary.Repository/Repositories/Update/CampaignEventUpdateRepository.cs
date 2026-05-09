using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignEventUpdateRepository
{
    Task UpdateVisibilityAsync(Guid eventId, bool isVisibleToPlayers);
    Task UpdateBodyAsync(Guid eventId, string body);
    Task UpdateFilePathAsync(Guid eventId, string filePath);
    Task UpdateDetailsAsync(Guid eventId, string title, string body, string linkedEntityType, Guid? linkedEntityId);
}

public class CampaignEventUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignEventUpdateRepository
{
    public async Task UpdateVisibilityAsync(Guid eventId, bool isVisibleToPlayers)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId, IsVisibleToPlayers = isVisibleToPlayers, UpdatedAt = DateTime.UtcNow };

        const string sql =
            @"UPDATE campaign_storyline
              SET visible_to_players = @IsVisibleToPlayers,
                  updated_at         = @UpdatedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params, rows);
    }

    public async Task UpdateBodyAsync(Guid eventId, string body)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId, Body = body, UpdatedAt = DateTime.UtcNow };

        const string sql =
            @"UPDATE campaign_storyline
              SET body       = @Body,
                  updated_at = @UpdatedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params, rows);
    }

    public async Task UpdateFilePathAsync(Guid eventId, string filePath)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId, FilePath = filePath, UpdatedAt = DateTime.UtcNow };

        const string sql =
            @"UPDATE campaign_storyline
              SET file_path  = @FilePath,
                  updated_at = @UpdatedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params, rows);
    }

    public async Task UpdateDetailsAsync(Guid eventId, string title, string body, string linkedEntityType, Guid? linkedEntityId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId, Title = title, Body = body, LinkedEntityType = linkedEntityType, LinkedEntityId = linkedEntityId, UpdatedAt = DateTime.UtcNow };

        const string sql =
            @"UPDATE campaign_storyline
              SET title              = @Title,
                  body               = @Body,
                  linked_entity_type = @LinkedEntityType,
                  linked_entity_id   = @LinkedEntityId,
                  updated_at         = @UpdatedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params, rows);
    }
}
