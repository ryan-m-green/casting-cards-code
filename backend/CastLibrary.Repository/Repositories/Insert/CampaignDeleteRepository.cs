using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignDeleteRepository
{
    Task DeleteAsync(Guid id);
    Task DeleteLocationInstanceAsync(Guid instanceId);
    Task DeleteCastInstanceAsync(Guid instanceId);
    Task DeleteSublocationInstanceAsync(Guid instanceId);
    Task DeleteFactionInstanceAsync(Guid factionInstanceId);
    Task RemoveFactionSublocationAsync(Guid factionInstanceId, Guid sublocationInstanceId);
    Task RemoveFactionCastMemberAsync(Guid factionInstanceId, Guid castInstanceId);
    Task DeleteFactionRelationshipAsync(Guid relationshipId);
}

public class CampaignDeleteRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignDeleteRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaigns", @params);

        using var conn = CreateConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        // Collect party anchor sublocation IDs before the campaign cascade removes their parent locations.
        // (locations.campaign_id FK is ON DELETE CASCADE, so locations will be deleted with the campaign.)
        var partySublocationIds = (await conn.QueryAsync<Guid>(
            @"SELECT s.id FROM sublocations s
              JOIN locations l ON l.id = s.location_id
              WHERE l.campaign_id = @Id",
            @params, transaction: tx)).ToList();

        // Deleting the campaign cascades to: campaign_*_instances, player_cards, invite codes, etc.
        // It also cascades to party anchor locations (via locations.campaign_id FK from migration [013]).
        var rows = await conn.ExecuteAsync("DELETE FROM campaigns WHERE id = @Id", @params, transaction: tx);

        // Remove the orphaned party anchor sublocations. Their location_id was SET NULL when the
        // parent location was cascade-deleted above, and campaign_sublocation_instances are now gone
        // so the ON DELETE RESTRICT constraint is cleared.
        if (partySublocationIds.Count > 0)
        {
            await conn.ExecuteAsync(
                "DELETE FROM sublocations WHERE id = ANY(@Ids)",
                new { Ids = partySublocationIds.ToArray() }, transaction: tx);
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaigns", @params, rows);
    }

    public async Task DeleteLocationInstanceAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_location_instances WHERE instance_id=@InstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_location_instances", @params, rows);
    }

    public async Task DeleteCastInstanceAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_cast_instances WHERE instance_id=@InstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_instances", @params, rows);
    }

    public async Task DeleteSublocationInstanceAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_sublocation_instances WHERE instance_id = @InstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task DeleteFactionInstanceAsync(Guid factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_faction_instances WHERE faction_instance_id = @FactionInstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_instances", @params, rows);
    }

    public async Task RemoveFactionSublocationAsync(Guid factionInstanceId, Guid sublocationInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId, SublocationInstanceId = sublocationInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_sublocations", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_faction_sublocations WHERE faction_instance_id = @FactionInstanceId AND sublocation_instance_id = @SublocationInstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_sublocations", @params, rows);
    }

    public async Task RemoveFactionCastMemberAsync(Guid factionInstanceId, Guid castInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId, CastInstanceId = castInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_cast_members", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_faction_cast_members WHERE faction_instance_id = @FactionInstanceId AND cast_instance_id = @CastInstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_cast_members", @params, rows);
    }

    public async Task DeleteFactionRelationshipAsync(Guid relationshipId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = relationshipId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_instance_relationships", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_faction_instance_relationships WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_faction_instance_relationships", @params, rows);
    }

    }


