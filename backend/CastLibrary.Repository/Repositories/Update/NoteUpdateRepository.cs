using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface INoteUpdateRepository
    {
        Task<CampaignNoteDomain> UpsertAsync(CampaignNoteDomain note);
    }
    public class NoteUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : INoteUpdateRepository
    {
        public async Task<CampaignNoteDomain> UpsertAsync(CampaignNoteDomain note)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                note.Id,
                note.CampaignId,
                EntityType = note.EntityType.ToString(),
                note.InstanceId,
                note.Content,
                note.CreatedByUserId,
                note.CreatedAt,
                note.UpdatedAt,
            };
            const string sql =
                @"INSERT INTO campaign_notes
                (id, campaign_id, entity_type, instance_id, content, created_by_user_id, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @EntityType, @InstanceId, @Content, @CreatedByUserId, @CreatedAt, @UpdatedAt)";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_notes", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_notes", @params, rows);
            return note;
        }
    }
}
