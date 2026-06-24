using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignUpdateRepository
{
    Task UpdateAsync(CampaignDomain campaign);
    Task UpdateLocationInstanceAsync(CampaignLocationInstanceDomain instance);
    Task UpdateCastInstanceAsync(CampaignCastInstanceDomain instance);
    Task UpdateSublocationInstanceAsync(CampaignSublocationInstanceDomain instance);
    Task UpdateLocationInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateSublocationInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateLocationSublocationsVisibilityAsync(Guid locationInstanceId, bool isVisibleToPlayers);
    Task UpdateLocationCastsVisibilityAsync(Guid locationInstanceId, bool isVisibleToPlayers);
    Task UpdateCastInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateSublocationCastsVisibilityAsync(Guid sublocationInstanceId, bool isVisibleToPlayers);
    Task UpdateCastCustomItemsAsync(Guid instanceId, string itemsJson);
    Task UpdateSublocationCustomItemsAsync(Guid instanceId, string itemsJson);
    Task UpdateLocationInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task UpdateCastInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task UpdateSublocationInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task ToggleShopItemScratchAsync(Guid shopItemId, bool isScratchedOff);
    Task UpdateShopItemAsync(Guid shopItemId, string name, int priceAmount, string priceCurrencyType);
    Task TravelCastAsync(Guid instanceId, Guid locationInstanceId, Guid sublocationInstanceId);
    Task UpdateFactionInstanceAsync(CampaignFactionInstanceDomain instance);
    Task UpdateFactionInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateSublocationFactionSymbolAsync(Guid instanceId, Guid? factionInstanceId, string symbolPath);
    Task UpdateSublocationPlayerFactionSymbolAsync(Guid instanceId, Guid? factionInstanceId, string symbolPath);
    Task SyncPlayerFactionSublocationMembershipAsync(Guid sublocationInstanceId, Guid? factionInstanceId);
    Task UpdateCastFactionSymbolsAsync(Guid instanceId, string factionSymbolsJson);
    Task UpdateCastPlayerFactionSymbolsAsync(Guid instanceId, string factionSymbolsJson);
    Task SyncPlayerFactionCastMembershipsAsync(Guid castInstanceId, List<Guid> factionInstanceIds);
    Task ClearFactionFromSublocationInstancesAsync(Guid factionInstanceId);
    Task ClearFactionFromCastInstancesAsync(Guid factionInstanceId);
    Task SetIsDemoAsync(Guid campaignId, bool? isDemo);
    Task UpdateLastAccessedAtAsync(Guid campaignId);
}

public class CampaignUpdateRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignUpdateRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task UpdateAsync(CampaignDomain campaign)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            campaign.Id,
            campaign.Name,
            campaign.Description,
            campaign.FantasyType,
            campaign.SpineColor,
            campaign.IsDemo,
            Status = campaign.Status.ToString(),
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaigns SET name=@Name, description=@Description, fantasy_type=@FantasyType, spine_color=@SpineColor, status=@Status, is_demo=@IsDemo WHERE id=@Id",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params, rows);
    }

    public async Task UpdateLocationInstanceAsync(CampaignLocationInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.Name,
            instance.Description,
            instance.Classification,
            instance.Size,
            instance.Condition,
            instance.Geography,
            instance.Architecture,
            instance.Climate,
            instance.Religion,
            instance.Vibe,
            instance.Languages,
            instance.DmNotes,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_location_instances
              SET name=@Name, description=@Description, classification=@Classification, size=@Size,
                  condition=@Condition, geography=@Geography, architecture=@Architecture,
                  climate=@Climate, religion=@Religion, vibe=@Vibe,
                  languages=@Languages, dm_notes=@DmNotes
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params, rows);
    }

    public async Task UpdateCastInstanceAsync(CampaignCastInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.Name,
            instance.PublicDescription,
            instance.Description,
            instance.Pronouns,
            instance.Race,
            instance.Role,
            instance.Age,
            instance.Alignment,
            instance.Posture,
            instance.Speed,
            instance.VoicePlacement,
            instance.VoiceNotes,
            instance.DmNotes,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET name=@Name,
                  public_description=@PublicDescription,
                  description=@Description,
                  pronouns=@Pronouns,
                  race=@Race,
                  role=@Role,
                  age=@Age,
                  alignment=@Alignment,
                  posture=@Posture,
                  speed=@Speed,
                  voice_placement=@VoicePlacement,
                  voice_notes=@VoiceNotes,
                  dm_notes=@DmNotes
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateSublocationInstanceAsync(CampaignSublocationInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.Description,
            instance.DmNotes,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_sublocation_instances
              SET description=@Description, dm_notes=@DmNotes
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task ToggleShopItemScratchAsync(Guid shopItemId, bool isScratchedOff)
    {
        var spanId = correlation.NewSpan();
        var @params = new { ShopItemId = shopItemId, IsScratchedOff = isScratchedOff };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_shop_items", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_sublocation_shop_items SET is_scratched_off=@IsScratchedOff WHERE id=@ShopItemId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_shop_items", @params, rows);
    }

    public async Task UpdateShopItemAsync(Guid shopItemId, string name, int priceAmount, string priceCurrencyType)
    {
        var spanId = correlation.NewSpan();
        var @params = new { ShopItemId = shopItemId, Name = name, PriceAmount = priceAmount, PriceCurrencyType = priceCurrencyType };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_shop_items", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_sublocation_shop_items SET name=@Name, price_amount=@PriceAmount, price_currency_type=@PriceCurrencyType WHERE id=@ShopItemId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_shop_items", @params, rows);
    }

    public async Task UpdateLocationInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_location_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params, rows);
    }

    public async Task UpdateSublocationInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_sublocation_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task UpdateLocationSublocationsVisibilityAsync(Guid locationInstanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { LocationInstanceId = locationInstanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_sublocation_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE location_instance_id=@LocationInstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task UpdateLocationCastsVisibilityAsync(Guid locationInstanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { LocationInstanceId = locationInstanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE location_instance_id=@LocationInstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateCastInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateSublocationCastsVisibilityAsync(Guid sublocationInstanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SublocationInstanceId = sublocationInstanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE sublocation_instance_id=@SublocationInstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateCastCustomItemsAsync(Guid instanceId, string itemsJson)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Items = itemsJson };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_cast_instances SET custom_items=@Items::jsonb WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task TravelCastAsync(Guid instanceId, Guid locationInstanceId, Guid sublocationInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, LocationInstanceId = locationInstanceId, SublocationInstanceId = sublocationInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET location_instance_id = @LocationInstanceId,
                  sublocation_instance_id = @SublocationInstanceId
              WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateSublocationCustomItemsAsync(Guid instanceId, string itemsJson)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Items = itemsJson };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_sublocation_instances SET custom_items=@Items::jsonb WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task UpdateLocationInstanceKeywordsAsync(Guid instanceId, string[] keywords)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Keywords = keywords };
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params);
        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_location_instances SET keywords = @Keywords::text[] WHERE instance_id = @InstanceId",
            @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params, rows);
    }

    public async Task UpdateCastInstanceKeywordsAsync(Guid instanceId, string[] keywords)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Keywords = keywords };
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);
        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_cast_instances SET keywords = @Keywords::text[] WHERE instance_id = @InstanceId",
            @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateSublocationInstanceKeywordsAsync(Guid instanceId, string[] keywords)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Keywords = keywords };
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);
        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_sublocation_instances SET keywords = @Keywords::text[] WHERE instance_id = @InstanceId",
            @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task UpdateFactionInstanceAsync(CampaignFactionInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.FactionInstanceId,
            instance.Name,
            instance.Type,
            instance.Description,
            instance.Hidden,
            instance.DmNotes,
            instance.Influence,
            instance.Perception,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_faction_instances
              SET name=@Name, type=@Type, description=@Description, hidden=@Hidden, dm_notes=@DmNotes,
                  influence=@Influence, perception=@Perception
              WHERE faction_instance_id=@FactionInstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_instances", @params, rows);
    }

    public async Task UpdateFactionInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_faction_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE faction_instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_faction_instances", @params, rows);
    }

    public async Task UpdateSublocationFactionSymbolAsync(Guid instanceId, Guid? factionInstanceId, string symbolPath)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, FactionInstanceId = factionInstanceId, SymbolPath = symbolPath };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_sublocation_instances
              SET faction_instance_id = @FactionInstanceId,
                  symbol_path = @SymbolPath
              WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task UpdateSublocationPlayerFactionSymbolAsync(Guid instanceId, Guid? factionInstanceId, string symbolPath)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, FactionInstanceId = factionInstanceId, SymbolPath = symbolPath };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances (player)", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_sublocation_instances
              SET player_faction_instance_id = @FactionInstanceId,
                  player_symbol_path = @SymbolPath
              WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances (player)", @params, rows);
    }

    public async Task SyncPlayerFactionSublocationMembershipAsync(Guid sublocationInstanceId, Guid? factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var deleteParams = new { SublocationInstanceId = sublocationInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SYNC", "campaign_faction_sublocations (player)", deleteParams);

        using var conn = CreateConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        await conn.ExecuteAsync(
            "DELETE FROM campaign_faction_sublocations WHERE sublocation_instance_id = @SublocationInstanceId AND dm_user_id IS NULL",
            deleteParams, tx);

        if (factionInstanceId.HasValue)
        {
            var insertParams = new
            {
                Id = Guid.NewGuid(),
                FactionInstanceId = factionInstanceId.Value,
                SublocationInstanceId = sublocationInstanceId
            };

            await conn.ExecuteAsync(
                @"INSERT INTO campaign_faction_sublocations (id, faction_instance_id, sublocation_instance_id, dm_user_id)
                  VALUES (@Id, @FactionInstanceId, @SublocationInstanceId, NULL)
                  ON CONFLICT DO NOTHING",
                insertParams, tx);
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "SYNC", "campaign_faction_sublocations (player)", deleteParams, factionInstanceId.HasValue ? 1 : 0);
    }

    public async Task UpdateCastFactionSymbolsAsync(Guid instanceId, string factionSymbolsJson)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Symbols = factionSymbolsJson };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET faction_symbols = @Symbols::jsonb
              WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task UpdateCastPlayerFactionSymbolsAsync(Guid instanceId, string factionSymbolsJson)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Symbols = factionSymbolsJson };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances (player_faction_symbols)", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET player_faction_symbols = @Symbols::jsonb
              WHERE instance_id = @InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances (player_faction_symbols)", @params, rows);
    }

    public async Task SyncPlayerFactionCastMembershipsAsync(Guid castInstanceId, List<Guid> factionInstanceIds)
    {
        var spanId = correlation.NewSpan();
        var deleteParams = new { CastInstanceId = castInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SYNC", "campaign_faction_cast_members (player)", deleteParams);

        using var conn = CreateConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        await conn.ExecuteAsync(
            "DELETE FROM campaign_faction_cast_members WHERE cast_instance_id = @CastInstanceId AND dm_user_id IS NULL",
            deleteParams, tx);

        if (factionInstanceIds.Count > 0)
        {
            var insertParams = factionInstanceIds.Select(fid => new
            {
                Id = Guid.NewGuid(),
                FactionInstanceId = fid,
                CastInstanceId = castInstanceId
            });

            await conn.ExecuteAsync(
                @"INSERT INTO campaign_faction_cast_members (id, faction_instance_id, cast_instance_id, dm_user_id)
                  VALUES (@Id, @FactionInstanceId, @CastInstanceId, NULL)
                  ON CONFLICT DO NOTHING",
                insertParams, tx);
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "SYNC", "campaign_faction_cast_members (player)", deleteParams, factionInstanceIds.Count);
    }

    public async Task ClearFactionFromSublocationInstancesAsync(Guid factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_sublocation_instances
              SET faction_instance_id = NULL,
                  symbol_path = NULL
              WHERE faction_instance_id = @FactionInstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_sublocation_instances", @params, rows);
    }

    public async Task ClearFactionFromCastInstancesAsync(Guid factionInstanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { FactionInstanceId = factionInstanceId.ToString() };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET faction_symbols = (
                  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                  FROM jsonb_array_elements(COALESCE(faction_symbols, '[]'::jsonb)) AS elem
                  WHERE elem->>'FactionInstanceId' <> @FactionInstanceId
              )
              WHERE faction_symbols IS NOT NULL
                AND faction_symbols @> jsonb_build_array(jsonb_build_object('FactionInstanceId', @FactionInstanceId))",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params, rows);
    }

    public async Task SetIsDemoAsync(Guid campaignId, bool? isDemo)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = campaignId, IsDemo = isDemo };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaigns SET is_demo=@IsDemo WHERE id=@Id",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params, rows);
    }

    public async Task UpdateLastAccessedAtAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = campaignId, LastAccessedAt = DateTime.UtcNow };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaigns SET last_accessed_at=@LastAccessedAt WHERE id=@Id",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params, rows);
    }
}
