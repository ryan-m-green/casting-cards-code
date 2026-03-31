using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface INoteReadRepository
{
    Task<List<CampaignNoteDomain>> GetByEntityAsync(Guid campaignId, string entityType, Guid instanceId);    
}
public class NoteReadRepository(
    ISqlConnectionFactory      sqlConnectionFactory,
    ILoggingService     logging,
    ICorrelationContext correlation) : INoteReadRepository
{
    public async Task<List<CampaignNoteDomain>> GetByEntityAsync(
        Guid campaignId, string entityType, Guid instanceId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, EntityType = entityType, InstanceId = instanceId };
        const string sql =
            @"SELECT n.*, u.display_name
              FROM   campaign_notes n
              JOIN   users          u ON u.id = n.created_by_user_id
              WHERE  n.campaign_id  = @CampaignId
                AND  n.entity_type  = @EntityType
                AND  n.instance_id  = @InstanceId
              ORDER BY n.created_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<dynamic>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_notes",
            @params, rows.Count);

        return rows.Select(r => new CampaignNoteDomain
        {
            Id                   = r.id,
            CampaignId           = r.campaign_id,
            EntityType           = Enum.Parse<EntityType>((string)r.entity_type, ignoreCase: true),
            InstanceId           = r.instance_id,
            Content              = r.content,
            CreatedByUserId      = r.created_by_user_id,
            CreatedByDisplayName = r.display_name,
            CreatedAt            = r.created_at,
            UpdatedAt            = r.updated_at,
        }).ToList();
    }
}
