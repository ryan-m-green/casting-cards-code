using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Delete;

public interface ICampaignInsertRepository
{
    Task<CampaignDomain> InsertAsync(CampaignDomain campaign);
    Task<CampaignCastInstanceDomain> InsertCastInstanceAsync(CampaignCastInstanceDomain instance);
    Task<CampaignLocationInstanceDomain> InsertLocationInstanceAsync(CampaignLocationInstanceDomain instance);
    Task<CampaignSublocationInstanceDomain> InsertSublocationInstanceAsync(CampaignSublocationInstanceDomain instance);
    Task<ShopItemDomain> InsertSublocationShopItemAsync(Guid sublocationInstanceId, ShopItemDomain item);
    Task<CampaignFactionInstanceDomain> InsertFactionInstanceAsync(CampaignFactionInstanceDomain instance);
    Task AddFactionSublocationAsync(Guid factionInstanceId, Guid sublocationInstanceId, Guid? dmUserId);
    Task AddFactionCastMemberAsync(Guid factionInstanceId, Guid castInstanceId, Guid? dmUserId);
    Task SetFactionSublocationPrimaryAsync(Guid factionInstanceId, Guid sublocationInstanceId);
    Task SetFactionCastMemberPrimaryAsync(Guid factionInstanceId, Guid castInstanceId);
    Task ClearFactionSublocationPrimaryAsync(Guid factionInstanceId);
    Task ClearFactionCastMemberPrimaryAsync(Guid factionInstanceId);
    Task<CampaignFactionRelationshipDomain> InsertFactionRelationshipAsync(CampaignFactionRelationshipDomain domain);
}

public class CampaignInsertRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignInsertRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<CampaignDomain> InsertAsync(CampaignDomain campaign)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            campaign.Id,
            campaign.DmUserId,
            campaign.Name,
            campaign.Description,
            campaign.FantasyType,
            Status = campaign.Status.ToString(),
            campaign.SpineColor,
            campaign.IsDemo,
            campaign.CreatedAt,
        };
        const string sql =
            @"INSERT INTO campaigns
                (id, dm_user_id, name, description, fantasy_type, status, spine_color, is_demo, created_at)
              VALUES
                (@Id, @DmUserId, @Name, @Description, @FantasyType, @Status, @SpineColor, @IsDemo, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaigns", @params, rows);
        return campaign;
    }

    public async Task<CampaignLocationInstanceDomain> InsertLocationInstanceAsync(CampaignLocationInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.CampaignId,
            instance.SourceLocationId,
            instance.Name,
            instance.Classification,
            instance.Size,
            instance.Condition,
            instance.Geography,
            instance.Architecture,
            instance.Climate,
            instance.Religion,
            instance.Vibe,
            instance.Languages,
            instance.Description,
            instance.IsVisibleToPlayers,
            instance.SortOrder,
            instance.IsPartyAnchor,
        };
        const string sql =
            @"INSERT INTO campaign_location_instances
                (instance_id, campaign_id, source_location_id, name, classification, size, condition,
                 geography, architecture, climate, religion, vibe, languages, description,
                 is_visible_to_players, sort_order, is_party_anchor, created_at)
              VALUES
                (@InstanceId, @CampaignId, @SourceLocationId, @Name, @Classification, @Size, @Condition,
                 @Geography, @Architecture, @Climate, @Religion, @Vibe, @Languages, @Description,
                 @IsVisibleToPlayers, @SortOrder, @IsPartyAnchor, NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_location_instances", @params, rows);
        return instance;
    }

    public async Task<CampaignCastInstanceDomain> InsertCastInstanceAsync(CampaignCastInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.CampaignId,
            instance.SourceCastId,
            instance.LocationInstanceId,
            instance.SublocationInstanceId,
            instance.Name,
            instance.Pronouns,
            instance.Race,
            instance.Role,
            instance.Age,
            instance.Alignment,
            instance.Posture,
            instance.Speed,
            instance.VoicePlacement,
            instance.Description,
            instance.PublicDescription,
            instance.IsVisibleToPlayers,
        };
        const string sql =
            @"INSERT INTO campaign_cast_instances
                (instance_id, campaign_id, source_cast_id, location_instance_id, sublocation_instance_id,
                 name, pronouns, race, role, age, alignment, posture, speed, voice_placement,
                 description, public_description, is_visible_to_players, created_at)
              VALUES
                (@InstanceId, @CampaignId, @SourceCastId, @LocationInstanceId, @SublocationInstanceId,
                 @Name, @Pronouns, @Race, @Role, @Age, @Alignment, @Posture, @Speed,
                 @VoicePlacement::text[], @Description, @PublicDescription, @IsVisibleToPlayers, NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_cast_instances", @params, rows);
        return instance;
    }

    public async Task<CampaignSublocationInstanceDomain> InsertSublocationInstanceAsync(CampaignSublocationInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.CampaignId,
            instance.SourceSublocationId,
            instance.LocationInstanceId,
            instance.Name,
            instance.Description,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        await conn.ExecuteAsync(
            @"INSERT INTO campaign_sublocation_instances
                (instance_id, campaign_id, source_sublocation_id, location_instance_id,
                 name, description, created_at)
              VALUES
                (@InstanceId, @CampaignId, @SourceSublocationId, @LocationInstanceId,
                 @Name, @Description, NOW())",
            @params, tx);

        foreach (var item in instance.ShopItems)
        {
            await conn.ExecuteAsync(
                @"INSERT INTO campaign_sublocation_shop_items
                    (id, sublocation_instance_id, name, price_amount, price_currency_type, description, sort_order)
                  VALUES
                    (@Id, @SublocationInstanceId, @Name, @PriceAmount, @PriceCurrencyType, @Description, @SortOrder)",
                new
                {
                    Id = Guid.NewGuid(),
                    SublocationInstanceId = instance.InstanceId,
                    item.Name,
                    item.PriceAmount,
                    item.PriceCurrencyType,
                    item.Description,
                    item.SortOrder,
                }, tx);
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_sublocation_instances",
            @params, 1 + instance.ShopItems.Count);

        return instance;
    }

    public async Task<ShopItemDomain> InsertSublocationShopItemAsync(Guid sublocationInstanceId, ShopItemDomain item)
    {
        var spanId = correlation.NewSpan();
        item.Id = Guid.NewGuid();
        item.SublocationId = sublocationInstanceId;

        var @params = new
        {
            Id = item.Id,
            SublocationInstanceId = sublocationInstanceId,
            item.Name,
            item.PriceAmount,
            item.PriceCurrencyType,
            item.Description,
            item.SortOrder,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_sublocation_shop_items", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"INSERT INTO campaign_sublocation_shop_items
                (id, sublocation_instance_id, name, price_amount, price_currency_type, description, sort_order)
              VALUES
                (@Id, @SublocationInstanceId, @Name, @PriceAmount, @PriceCurrencyType, @Description, @SortOrder)",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_sublocation_shop_items", @params, rows);
        return item;
    }

    public async Task<CampaignFactionInstanceDomain> InsertFactionInstanceAsync(CampaignFactionInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.FactionInstanceId,
            instance.SourceFactionId,
            instance.CampaignId,
            instance.DmUserId,
            instance.Name,
            instance.Type,
            instance.Influence,
            instance.Hidden,
            instance.IsVisibleToPlayers,
            instance.Description,
            instance.DmNotes,
            instance.SymbolPath,
            instance.CreatedAt,
        };
        const string sql =
            @"INSERT INTO campaign_faction_instances
                (faction_instance_id, source_faction_id, campaign_id, dm_user_id,
                 name, type, influence, hidden, is_visible_to_players, description, dm_notes, symbol_path, created_at)
              VALUES
                (@FactionInstanceId, @SourceFactionId, @CampaignId, @DmUserId,
                 @Name, @Type, @Influence, @Hidden, @IsVisibleToPlayers, @Description, @DmNotes, @SymbolPath, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_instances", @params, rows);
        return instance;
    }

    public async Task AddFactionSublocationAsync(Guid factionInstanceId, Guid sublocationInstanceId, Guid? dmUserId)
    {
        var spanId = correlation.NewSpan();
        using var conn = CreateConnection();

        if (dmUserId.HasValue)
        {
            var @params = new { Id = Guid.NewGuid(), FactionInstanceId = factionInstanceId, SublocationInstanceId = sublocationInstanceId, DmUserId = dmUserId.Value };
            const string sql =
                @"INSERT INTO campaign_faction_sublocations (id, faction_instance_id, sublocation_instance_id, dm_user_id)
                  VALUES (@Id, @FactionInstanceId, @SublocationInstanceId, @DmUserId)
                  ON CONFLICT DO NOTHING";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_sublocations", @params);
            var rows = await conn.ExecuteAsync(sql, @params);
            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_sublocations", @params, rows);
        }
        else
        {
            var @params = new { Id = Guid.NewGuid(), FactionInstanceId = factionInstanceId, SublocationInstanceId = sublocationInstanceId };
            const string sql =
                @"INSERT INTO campaign_faction_sublocations (id, faction_instance_id, sublocation_instance_id, dm_user_id)
                  SELECT @Id, @FactionInstanceId, @SublocationInstanceId, NULL
                  WHERE NOT EXISTS (
                      SELECT 1 FROM campaign_faction_sublocations
                      WHERE faction_instance_id = @FactionInstanceId
                        AND sublocation_instance_id = @SublocationInstanceId
                        AND dm_user_id IS NULL
                  )";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_sublocations", @params);
            var rows = await conn.ExecuteAsync(sql, @params);
            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_sublocations", @params, rows);
        }
    }

    public async Task AddFactionCastMemberAsync(Guid factionInstanceId, Guid castInstanceId, Guid? dmUserId)
    {
        var spanId = correlation.NewSpan();
        using var conn = CreateConnection();

        if (dmUserId.HasValue)
        {
            var @params = new { Id = Guid.NewGuid(), FactionInstanceId = factionInstanceId, CastInstanceId = castInstanceId, DmUserId = dmUserId.Value };
            const string sql =
                @"INSERT INTO campaign_faction_cast_members (id, faction_instance_id, cast_instance_id, dm_user_id)
                  VALUES (@Id, @FactionInstanceId, @CastInstanceId, @DmUserId)
                  ON CONFLICT DO NOTHING";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_cast_members", @params);
            var rows = await conn.ExecuteAsync(sql, @params);
            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_cast_members", @params, rows);
        }
        else
        {
            var @params = new { Id = Guid.NewGuid(), FactionInstanceId = factionInstanceId, CastInstanceId = castInstanceId };
            const string sql =
                @"INSERT INTO campaign_faction_cast_members (id, faction_instance_id, cast_instance_id, dm_user_id)
                  SELECT @Id, @FactionInstanceId, @CastInstanceId, NULL
                  WHERE NOT EXISTS (
                      SELECT 1 FROM campaign_faction_cast_members
                      WHERE faction_instance_id = @FactionInstanceId
                        AND cast_instance_id = @CastInstanceId
                        AND dm_user_id IS NULL
                  )";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_cast_members", @params);
            var rows = await conn.ExecuteAsync(sql, @params);
            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_cast_members", @params, rows);
        }
    }

    public async Task SetFactionSublocationPrimaryAsync(Guid factionInstanceId, Guid sublocationInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId, SublocationInstanceId = sublocationInstanceId };
        const string sql =
            @"UPDATE campaign_faction_sublocations
                 SET is_primary = (sublocation_instance_id = @SublocationInstanceId)
               WHERE faction_instance_id = @FactionInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_sublocations", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_sublocations", @params, rows);
    }

    public async Task SetFactionCastMemberPrimaryAsync(Guid factionInstanceId, Guid castInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId, CastInstanceId = castInstanceId };
        const string sql =
            @"UPDATE campaign_faction_cast_members
                 SET is_primary = (cast_instance_id = @CastInstanceId)
               WHERE faction_instance_id = @FactionInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_cast_members", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_cast_members", @params, rows);
    }

    public async Task ClearFactionSublocationPrimaryAsync(Guid factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId };
        const string sql =
            @"UPDATE campaign_faction_sublocations
                 SET is_primary = FALSE
               WHERE faction_instance_id = @FactionInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_sublocations", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_sublocations", @params, rows);
    }

    public async Task ClearFactionCastMemberPrimaryAsync(Guid factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId };
        const string sql =
            @"UPDATE campaign_faction_cast_members
                 SET is_primary = FALSE
               WHERE faction_instance_id = @FactionInstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_cast_members", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_cast_members", @params, rows);
    }

    public async Task<CampaignFactionRelationshipDomain> InsertFactionRelationshipAsync(CampaignFactionRelationshipDomain domain)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.FactionInstanceIdA,
            domain.FactionInstanceIdB,
            domain.RelationshipType,
            domain.Strength,
            domain.CreatedAt,
            domain.DmUserId,
        };
        const string sql =
            @"INSERT INTO campaign_faction_instance_relationships
                (id, campaign_id, faction_instance_id_a, faction_instance_id_b, relationship_type, strength, created_at, dm_user_id)
              VALUES
                (@Id, @CampaignId, @FactionInstanceIdA, @FactionInstanceIdB, @RelationshipType, @Strength, @CreatedAt, @DmUserId)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_instance_relationships", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_faction_instance_relationships", @params, rows);
        return domain;
    }

    }




