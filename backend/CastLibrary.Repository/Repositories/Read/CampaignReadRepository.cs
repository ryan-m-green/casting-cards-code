using System.Text.Json;
using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignReadRepository
{
    Task<List<CampaignDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<List<CampaignDomain>> GetAllByPlayerAsync(Guid playerUserId);
    Task<CampaignDomain> GetByIdAsync(Guid id);
    Task<CampaignCastInstanceDomain> GetCastInstanceBySourceCastIdAsync(Guid campaignId, Guid sourceCastId);
    Task<CampaignCastInstanceDomain> GetCastInstanceByIdAsync(Guid instanceId);
    Task<List<CampaignCastInstanceDomain>> GetCastInstancesByCampaignAsync(Guid campaignId);
    Task<List<CampaignLocationInstanceDomain>> GetLocationInstancesByCampaignAsync(Guid campaignId);
    Task<CampaignLocationInstanceDomain> GetLocationInstanceByIdAsync(Guid instanceId);
    Task<List<CampaignSublocationInstanceDomain>> GetSublocationInstancesByCampaignAsync(Guid campaignId);
    Task<CampaignSublocationInstanceDomain> GetSublocationInstanceByIdAsync(Guid instanceId);
    Task<CampaignSublocationInstanceDomain> GetSublocationInstanceBySourceSublocationIdAsync(Guid campaignId, Guid sourceSublocationId);
}

public class CampaignReadRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignEntityMapper mapper) : ICampaignReadRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<List<CampaignDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT c.id,
                c.dm_user_id     AS DmUserId,
                c.name,
                c.description,
                c.fantasy_type   AS FantasyType,
                c.status,
                c.spine_color    AS SpineColor,
                c.created_at     AS CreatedAt,
                COALESCE(ci.location_count, 0)   AS LocationCount,
                COALESCE(cp.player_count, 0) AS PlayerCount
              FROM campaigns c
              LEFT JOIN (
                SELECT campaign_id, COUNT(*) AS location_count
                FROM campaign_location_instances
                GROUP BY campaign_id
              ) ci ON ci.campaign_id = c.id
              LEFT JOIN (
                SELECT campaign_id, COUNT(*) AS player_count
                FROM campaign_players
                GROUP BY campaign_id
              ) cp ON cp.campaign_id = c.id
              WHERE c.dm_user_id = @DmUserId
              ORDER BY c.created_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaigns", @params);

        using var conn = CreateConnection();
        var entities = (await conn.QueryAsync<CampaignEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaigns", @params, entities.Count);
        return entities.Select(mapper.ToDomain).ToList();
    }

    public async Task<List<CampaignDomain>> GetAllByPlayerAsync(Guid playerUserId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { PlayerUserId = playerUserId };
        const string sql =
            @"SELECT c.id,
                c.dm_user_id     AS DmUserId,
                c.name,
                c.description,
                c.fantasy_type   AS FantasyType,
                c.status,
                c.spine_color    AS SpineColor,
                c.created_at     AS CreatedAt,
                COALESCE(ci.location_count, 0)   AS LocationCount,
                COALESCE(cp.player_count, 0) AS PlayerCount
              FROM campaigns c
              INNER JOIN campaign_players cp2 ON cp2.campaign_id = c.id AND cp2.player_user_id = @PlayerUserId
              LEFT JOIN (
                SELECT campaign_id, COUNT(*) AS location_count
                FROM campaign_location_instances
                GROUP BY campaign_id
              ) ci ON ci.campaign_id = c.id
              LEFT JOIN (
                SELECT campaign_id, COUNT(*) AS player_count
                FROM campaign_players
                GROUP BY campaign_id
              ) cp ON cp.campaign_id = c.id
              ORDER BY c.created_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaigns", @params);

        using var conn = CreateConnection();
        var entities = (await conn.QueryAsync<CampaignEntity>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaigns", @params, entities.Count);
        return entities.Select(mapper.ToDomain).ToList();
    }

    public async Task<CampaignDomain> GetByIdAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id,
                dm_user_id   AS DmUserId,
                name,
                description,
                fantasy_type AS FantasyType,
                status,
                spine_color  AS SpineColor,
                created_at   AS CreatedAt
              FROM campaigns WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaigns", @params);

        using var conn = CreateConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CampaignEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaigns",
            @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<List<CampaignLocationInstanceDomain>> GetLocationInstancesByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT ci.*
              FROM campaign_location_instances ci
              LEFT JOIN locations c ON c.id = ci.source_location_id
              WHERE ci.campaign_id = @CampaignId
              ORDER BY ci.sort_order";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = (await conn.QueryAsync<dynamic>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_instances",
            @params, rows.Count);

        return rows.Select(r => new CampaignLocationInstanceDomain
        {
            InstanceId = r.instance_id,
            CampaignId = r.campaign_id,
            SourceLocationId = r.source_location_id,
            Name = r.name,
            Classification = r.classification ?? string.Empty,
            Size = r.size ?? string.Empty,
            Condition = r.condition ?? string.Empty,
            Geography = r.geography ?? string.Empty,
            Architecture = r.architecture ?? string.Empty,
            Climate = r.climate ?? string.Empty,
            Religion = r.religion ?? string.Empty,
            Vibe = r.vibe ?? string.Empty,
            Languages = r.languages ?? string.Empty,
            Description = r.description ?? string.Empty,
            IsVisibleToPlayers = r.is_visible_to_players,
            ImageUrl = r.image_url ?? string.Empty,
            SortOrder = r.sort_order,
            Keywords = r.keywords ?? Array.Empty<string>(),
            DmNotes = r.dm_notes ?? string.Empty,
        }).ToList();
    }

    public async Task<CampaignCastInstanceDomain> GetCastInstanceBySourceCastIdAsync(Guid campaignId, Guid sourceCastId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, SourceCastId = sourceCastId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var r = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT * FROM campaign_cast_instances WHERE campaign_id = @CampaignId AND source_cast_id = @SourceCastId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances",
            @params, r is null ? 0 : 1);

        if (r is null) return null;
        return new CampaignCastInstanceDomain
        {
            InstanceId = r.instance_id,
            CampaignId = r.campaign_id,
            SourceCastId = r.source_cast_id,
            LocationInstanceId = r.location_instance_id,
            SublocationInstanceId = r.sublocation_instance_id,
            Name = r.name,
            Pronouns = r.pronouns ?? string.Empty,
            Race = r.race ?? string.Empty,
            Role = r.role ?? string.Empty,
            Age = r.age ?? string.Empty,
            Alignment = r.alignment ?? string.Empty,
            Posture = r.posture ?? string.Empty,
            Speed = r.speed ?? string.Empty,
            VoicePlacement = r.voice_placement ?? Array.Empty<string>(),
            Description = r.description ?? string.Empty,
            PublicDescription = r.public_description ?? string.Empty,
            IsVisibleToPlayers = r.is_visible_to_players,
            CustomItems = ParseCustomItems((string)r.custom_items),
            Keywords = r.keywords ?? Array.Empty<string>(),
            DmNotes = r.dm_notes ?? string.Empty,
        };
    }

    public async Task<CampaignCastInstanceDomain> GetCastInstanceByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var r = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT * FROM campaign_cast_instances WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances",
            @params, r is null ? 0 : 1);

        if (r is null) return null;
        return new CampaignCastInstanceDomain
        {
            InstanceId = r.instance_id,
            CampaignId = r.campaign_id,
            SourceCastId = r.source_cast_id,
            LocationInstanceId = r.location_instance_id,
            SublocationInstanceId = r.sublocation_instance_id,
            Name = r.name,
            Pronouns = r.pronouns ?? string.Empty,
            Race = r.race ?? string.Empty,
            Role = r.role ?? string.Empty,
            Age = r.age ?? string.Empty,
            Alignment = r.alignment ?? string.Empty,
            Posture = r.posture ?? string.Empty,
            Speed = r.speed ?? string.Empty,
            VoicePlacement = r.voice_placement ?? Array.Empty<string>(),
            Description = r.description ?? string.Empty,
            PublicDescription = r.public_description ?? string.Empty,
            IsVisibleToPlayers = r.is_visible_to_players,
            CustomItems = ParseCustomItems((string)r.custom_items),
            Keywords = r.keywords ?? Array.Empty<string>(),
            DmNotes = r.dm_notes ?? string.Empty,
        };
    }

    public async Task<List<CampaignCastInstanceDomain>> GetCastInstancesByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = (await conn.QueryAsync<dynamic>(
            "SELECT * FROM campaign_cast_instances WHERE campaign_id = @CampaignId ORDER BY name",
            @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances",
            @params, rows.Count);

        return rows.Select(r => new CampaignCastInstanceDomain
        {
            InstanceId = r.instance_id,
            CampaignId = r.campaign_id,
            SourceCastId = r.source_cast_id,
            LocationInstanceId = r.location_instance_id,
            SublocationInstanceId = r.sublocation_instance_id,
            Name = r.name,
            Pronouns = r.pronouns ?? string.Empty,
            Race = r.race ?? string.Empty,
            Role = r.role ?? string.Empty,
            Age = r.age ?? string.Empty,
            Alignment = r.alignment ?? string.Empty,
            Posture = r.posture ?? string.Empty,
            Speed = r.speed ?? string.Empty,
            VoicePlacement = r.voice_placement ?? Array.Empty<string>(),
            Description = r.description ?? string.Empty,
            PublicDescription = r.public_description ?? string.Empty,
            IsVisibleToPlayers = r.is_visible_to_players,
            CustomItems = ParseCustomItems((string)r.custom_items),
            Keywords = r.keywords ?? Array.Empty<string>(),
            DmNotes = r.dm_notes ?? string.Empty,
        }).ToList();
    }

    public async Task<CampaignLocationInstanceDomain> GetLocationInstanceByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = (await conn.QueryAsync<dynamic>(
            "SELECT cli.*, l.image_url FROM campaign_location_instances cli LEFT JOIN locations l ON l.id = cli.source_location_id WHERE cli.instance_id = @InstanceId",
            @params)).ToList();
        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_instances",
            @params, rows.Count);

        var r = rows.FirstOrDefault();
        if (r is null) return null;
        return new CampaignLocationInstanceDomain
        {
            InstanceId = r.instance_id,
            CampaignId = r.campaign_id,
            SourceLocationId = r.source_location_id,
            Name = r.name,
            Classification = r.classification ?? string.Empty,
            Size = r.size ?? string.Empty,
            Condition = r.condition ?? string.Empty,
            Geography = r.geography ?? string.Empty,
            Architecture = r.architecture ?? string.Empty,
            Climate = r.climate ?? string.Empty,
            Religion = r.religion ?? string.Empty,
            Vibe = r.vibe ?? string.Empty,
            Languages = r.languages ?? string.Empty,
            Description = r.description ?? string.Empty,
            IsVisibleToPlayers = r.is_visible_to_players,
            SortOrder = r.sort_order,
            ImageUrl = r.image_url ?? string.Empty,
            Keywords = r.keywords ?? Array.Empty<string>(),
            DmNotes = r.dm_notes ?? string.Empty,
        };
    }

    public async Task<CampaignSublocationInstanceDomain> GetSublocationInstanceByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var r = await conn.QueryFirstOrDefaultAsync<dynamic>(
            @"SELECT instance_id, campaign_id, source_sublocation_id, location_instance_id,
                     is_visible_to_players, name, description, keywords, custom_items, dm_notes
              FROM campaign_sublocation_instances
              WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances",
            @params, r is null ? 0 : 1);

        if (r is null) return null;
        return new CampaignSublocationInstanceDomain
        {
            InstanceId           = r.instance_id,
            CampaignId           = r.campaign_id,
            SourceSublocationId  = r.source_sublocation_id,
            LocationInstanceId       = r.location_instance_id,
            IsVisibleToPlayers   = r.is_visible_to_players,
            Name                 = r.name,
            Description          = r.description ?? string.Empty,
            Keywords             = r.keywords ?? Array.Empty<string>(),
            CustomItems          = ParseCustomItems((string)r.custom_items),
            DmNotes              = r.dm_notes ?? string.Empty,
            ShopItems            = [],
        };
    }

    public async Task<List<CampaignSublocationInstanceDomain>> GetSublocationInstancesByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var instances = (await conn.QueryAsync<dynamic>(
            @"SELECT instance_id, campaign_id, source_sublocation_id, location_instance_id,
                     is_visible_to_players, name, description, keywords, custom_items, dm_notes
              FROM campaign_sublocation_instances
              WHERE campaign_id = @CampaignId
              ORDER BY name",
            @params)).ToList();

        if (instances.Count == 0)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances",
                @params, 0);
            return [];
        }

        var domainInstances = instances.Select(r => new CampaignSublocationInstanceDomain
        {
            InstanceId          = r.instance_id,
            CampaignId          = r.campaign_id,
            SourceSublocationId = r.source_sublocation_id,
            LocationInstanceId      = r.location_instance_id,
            IsVisibleToPlayers  = r.is_visible_to_players,
            Name                = r.name,
            Description         = r.description ?? string.Empty,
            Keywords            = r.keywords ?? Array.Empty<string>(),
            CustomItems         = ParseCustomItems((string)r.custom_items),
            DmNotes             = r.dm_notes ?? string.Empty,
            ShopItems           = [],
        }).ToList();

        var instanceIds = domainInstances.Select(i => i.InstanceId).ToArray();
        var shopItems = (await conn.QueryAsync<dynamic>(
            @"SELECT id, sublocation_instance_id, name, price, description, sort_order, is_scratched_off
              FROM campaign_sublocation_shop_items
              WHERE sublocation_instance_id = ANY(@Ids)
              ORDER BY sort_order",
            new { Ids = instanceIds })).ToList();

        foreach (var inst in domainInstances)
        {
            inst.ShopItems = shopItems
                .Where(s => (Guid)s.sublocation_instance_id == inst.InstanceId)
                .Select(s => new ShopItemDomain
                {
                    Id = s.id,
                    SublocationId = s.sublocation_instance_id,
                    Name = s.name,
                    Price = s.price ?? string.Empty,
                    Description = s.description ?? string.Empty,
                    SortOrder = s.sort_order,
                    IsScratchedOff = s.is_scratched_off,
                }).ToList();
        }

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances",
            @params, domainInstances.Count);

        return domainInstances;
    }

    public async Task<CampaignSublocationInstanceDomain> GetSublocationInstanceBySourceSublocationIdAsync(Guid campaignId, Guid sourceSublocationId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, SourceSublocationId = sourceSublocationId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var r = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT * FROM campaign_sublocation_instances WHERE campaign_id = @CampaignId AND source_sublocation_id = @SourceSublocationId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances",
            @params, r is null ? 0 : 1);

        if (r is null) return null;
        return new CampaignSublocationInstanceDomain
        {
            InstanceId          = r.instance_id,
            CampaignId          = r.campaign_id,
            SourceSublocationId = r.source_sublocation_id,
            LocationInstanceId      = r.location_instance_id,
            Name                = r.name,
            Description         = r.description ?? string.Empty,
            Keywords            = r.keywords ?? Array.Empty<string>(),
            CustomItems         = ParseCustomItems((string)r.custom_items),
            ShopItems           = [],
        };
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static List<CampaignCastCustomItemDomain> ParseCustomItems(string json)
    {
        if (string.IsNullOrEmpty(json) || json == "[]") return [];
        try
        {
            return JsonSerializer.Deserialize<List<CampaignCastCustomItemDomain>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch { return []; }
    }
}





