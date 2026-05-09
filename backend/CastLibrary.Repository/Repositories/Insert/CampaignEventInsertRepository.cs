using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignEventInsertRepository
{
    Task<CampaignEventDomain> InsertAsync(CampaignEventDomain domain);
}

public class CampaignEventInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignEventInsertRepository
{
    public async Task<CampaignEventDomain> InsertAsync(CampaignEventDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.Title,
            domain.Body,
            domain.SortOrder,
            domain.LinkedEntityId,
            domain.LinkedEntityType,
            domain.FilePath,
            domain.VisibleToPlayers,
            domain.CreatedAt,
            domain.UpdatedAt,
        };

        const string sql =
            @"INSERT INTO campaign_storyline
                (id, campaign_id, title, body, sort_order, linked_entity_id, linked_entity_type, file_path, visible_to_players, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @Title, @Body, @SortOrder, @LinkedEntityId, @LinkedEntityType, @FilePath, @VisibleToPlayers, @CreatedAt, @UpdatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_storyline", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_storyline", @params, rows);
        return domain;
    }
}
