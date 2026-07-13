using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ICastPlayerNotesUpdateRepository
    {
        Task<CampaignCastPlayerNotesDomain> UpsertAsync(CampaignCastPlayerNotesDomain domain);
        Task DeleteAsync(Guid campaignId, Guid castInstanceId);
    }
    public class CastPlayerNotesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignCastPlayerNotesEntityMapper mapper) : ICastPlayerNotesUpdateRepository
    {
        public async Task<CampaignCastPlayerNotesDomain> UpsertAsync(CampaignCastPlayerNotesDomain domain)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                domain.Id,
                domain.CampaignId,
                domain.CastInstanceId,
                domain.Notes,
                Connections = domain.Connections.Select(g => g.ToString()).ToArray(),
                domain.Alignment,
                domain.Perception,
                domain.Rating,
                domain.CreatedAt,
                domain.UpdatedAt,
            };
            const string sql =
                @"INSERT INTO campaign_cast_player_notes
                (id, campaign_id, cast_instance_id, notes, connections, alignment, perception, rating, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @CastInstanceId, @Notes, @Connections::text[], @Alignment, @Perception, @Rating, @CreatedAt, @UpdatedAt)
              ON CONFLICT (campaign_id, cast_instance_id) DO UPDATE SET
                notes            = EXCLUDED.notes,
                connections      = EXCLUDED.connections,
                alignment        = EXCLUDED.alignment,
                perception       = EXCLUDED.perception,
                rating           = EXCLUDED.rating,
                updated_at       = EXCLUDED.updated_at
              RETURNING id, campaign_id, cast_instance_id, notes, connections, alignment, perception, rating, created_at, updated_at";

            logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_cast_player_notes", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var row = await conn.QueryFirstAsync<CampaignCastPlayerNotesEntity>(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_cast_player_notes", @params, 1);
            return mapper.ToDomain(row);
        }

        public async Task DeleteAsync(Guid campaignId, Guid castInstanceId)
        {
            var spanId = correlation.NewSpan();
            var @params = new { CampaignId = campaignId, CastInstanceId = castInstanceId };
            const string sql = @"
                DELETE FROM campaign_cast_player_notes
                WHERE campaign_id = @CampaignId AND cast_instance_id = @CastInstanceId";

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_player_notes", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_player_notes", @params, 1);
        }
    }
}
