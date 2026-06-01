using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignEventArchivedInsertRepository
{
    Task<CampaignEventArchivedDomain> InsertAsync(CampaignEventArchivedDomain domain);
}

public class StorylineArchivedInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignEventArchivedInsertRepository
{
    public async Task<CampaignEventArchivedDomain> InsertAsync(CampaignEventArchivedDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var linkedEntitiesJson = CampaignEventEntityMapper.ToJson(domain.LinkedEntities);
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.Title,
            domain.Body,
            domain.SortOrder,
            LinkedEntities = linkedEntitiesJson,
            domain.FilePath,
            domain.TodSliceName,
            domain.InGameDays,
            domain.ArchivedAt,
            domain.CreatedAt,
            domain.UpdatedAt,
        };

        const string sql =
            @"INSERT INTO campaign_storyline_archived
                (id, campaign_id, title, body, sort_order, linked_entities, file_path, tod_slice_name, in_game_days, archived_at, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @Title, @Body, @SortOrder, @LinkedEntities::jsonb, @FilePath, @TodSliceName, @InGameDays, @ArchivedAt, @CreatedAt, @UpdatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_storyline_archived", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_storyline_archived", @params, 1);
        return domain;
    }
}
