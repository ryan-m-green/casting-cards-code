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
    Task UpdateCastInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateSublocationCastsVisibilityAsync(Guid sublocationInstanceId, bool isVisibleToPlayers);
    Task UpdateCastCustomItemsAsync(Guid instanceId, string itemsJson);
    Task UpdateSublocationCustomItemsAsync(Guid instanceId, string itemsJson);
    Task UpdateLocationInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task UpdateCastInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task UpdateSublocationInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task ToggleShopItemScratchAsync(Guid shopItemId, bool isScratchedOff);
    Task TravelCastAsync(Guid instanceId, Guid locationInstanceId, Guid sublocationInstanceId);
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
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaigns SET name=@Name, description=@Description, fantasy_type=@FantasyType, spine_color=@SpineColor WHERE id=@Id",
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
            instance.PublicDescription,
            instance.Description,
            instance.Pronouns,
            instance.Race,
            instance.Role,
            instance.Age,
            instance.Alignment,
            instance.Posture,
            instance.Speed,
            instance.DmNotes,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_cast_instances
              SET public_description=@PublicDescription,
                  description=@Description,
                  pronouns=@Pronouns,
                  race=@Race,
                  role=@Role,
                  age=@Age,
                  alignment=@Alignment,
                  posture=@Posture,
                  speed=@Speed,
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
}
