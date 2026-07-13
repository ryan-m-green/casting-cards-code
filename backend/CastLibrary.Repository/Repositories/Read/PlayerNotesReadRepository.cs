using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IPlayerNotesReadRepository
{
    Task<List<PlayerNoteDomain>> GetAllPlayerNotesAsync(Guid campaignId);
}

public class PlayerNotesReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerNotesReadRepository
{
    public async Task<List<PlayerNoteDomain>> GetAllPlayerNotesAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        
        // Query all 5 player notes tables with entity names
        const string sql = @"
            SELECT 
                ccpn.id AS Id,
                ccpn.campaign_id AS CampaignId,
                'cast' AS EntityType,
                ccpn.cast_instance_id AS EntityId,
                ci.name AS EntityName,
                ccpn.notes AS Notes,
                ccpn.created_at AS CreatedAt,
                ccpn.updated_at AS UpdatedAt
            FROM campaign_cast_player_notes ccpn
            JOIN campaign_cast_instances ci ON ccpn.cast_instance_id = ci.instance_id
            WHERE ccpn.campaign_id = @CampaignId
            
            UNION ALL
            
            SELECT 
                clpn.id AS Id,
                clpn.campaign_id AS CampaignId,
                'location' AS EntityType,
                clpn.location_instance_id AS EntityId,
                li.name AS EntityName,
                clpn.notes AS Notes,
                clpn.created_at AS CreatedAt,
                clpn.updated_at AS UpdatedAt
            FROM campaign_location_player_notes clpn
            JOIN campaign_location_instances li ON clpn.location_instance_id = li.instance_id
            WHERE clpn.campaign_id = @CampaignId
            
            UNION ALL
            
            SELECT 
                cspn.id AS Id,
                cspn.campaign_id AS CampaignId,
                'sublocation' AS EntityType,
                cspn.sublocation_instance_id AS EntityId,
                si.name AS EntityName,
                cspn.notes AS Notes,
                cspn.created_at AS CreatedAt,
                cspn.updated_at AS UpdatedAt
            FROM campaign_sublocation_player_notes cspn
            JOIN campaign_sublocation_instances si ON cspn.sublocation_instance_id = si.instance_id
            WHERE cspn.campaign_id = @CampaignId
            
            UNION ALL
            
            SELECT 
                cfpn.id AS Id,
                cfpn.campaign_id AS CampaignId,
                'faction' AS EntityType,
                cfpn.faction_instance_id AS EntityId,
                fi.name AS EntityName,
                cfpn.player_notes AS Notes,
                cfpn.created_at AS CreatedAt,
                cfpn.updated_at AS UpdatedAt
            FROM campaign_faction_player_notes cfpn
            JOIN campaign_faction_instances fi ON cfpn.faction_instance_id = fi.faction_instance_id
            WHERE cfpn.campaign_id = @CampaignId
            
            UNION ALL
            
            SELECT 
                cpn.id AS Id,
                cpn.campaign_id AS CampaignId,
                'campaign' AS EntityType,
                NULL AS EntityId,
                c.name AS EntityName,
                cpn.notes AS Notes,
                cpn.created_at AS CreatedAt,
                cpn.updated_at AS UpdatedAt
            FROM campaign_player_notes cpn
            JOIN campaigns c ON cpn.campaign_id = c.id
            WHERE cpn.campaign_id = @CampaignId
            
            ORDER BY CreatedAt ASC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_notes_union", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = (await conn.QueryAsync<PlayerNoteDomain>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "player_notes_union", @params, rows.Count);

        return rows;
    }
}
