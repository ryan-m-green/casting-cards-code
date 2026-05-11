using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignEventUpdateRepository
{
    Task UpdateVisibilityAsync(Guid eventId, bool isVisibleToPlayers);
    Task UpdateBodyAsync(Guid eventId, string body);
    Task UpdateFilePathAsync(Guid eventId, string filePath);
    Task UpdateDetailsAsync(Guid eventId, string title, string body, string? linkedEntityType, Guid? linkedEntityId, decimal? todPositionPercent);
    Task ReorderAsync(IList<Guid> eventIds);
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

    public async Task UpdateDetailsAsync(Guid eventId, string title, string body, string? linkedEntityType, Guid? linkedEntityId, decimal? todPositionPercent)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = eventId, Title = title, Body = body, LinkedEntityType = linkedEntityType, LinkedEntityId = linkedEntityId, TodPositionPercent = todPositionPercent, UpdatedAt = DateTime.UtcNow };

        const string sql =
            @"UPDATE campaign_storyline
              SET title              = @Title,
                  body               = @Body,
                  linked_entity_type = @LinkedEntityType,
                  linked_entity_id   = @LinkedEntityId,
                  tod_position_percent = @TodPositionPercent,
                  updated_at         = @UpdatedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", @params, rows);
    }

    public async Task ReorderAsync(IList<Guid> eventIds)
    {
        var spanId    = correlation.NewSpan();
        var updatedAt = DateTime.UtcNow;

        const string sql =
            @"UPDATE campaign_storyline
              SET sort_order = @Order,
                  updated_at = @UpdatedAt
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", new { Count = eventIds.Count });

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        for (var i = 0; i < eventIds.Count; i++)
            await conn.ExecuteAsync(sql, new { Id = eventIds[i], Order = i, UpdatedAt = updatedAt }, tx);

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_storyline", new { Count = eventIds.Count }, eventIds.Count);
    }
}
