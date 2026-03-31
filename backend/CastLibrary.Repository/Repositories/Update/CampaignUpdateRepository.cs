using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignUpdateRepository
{
    Task UpdateAsync(CampaignDomain campaign);
    Task UpdateCityInstanceAsync(CampaignCityInstanceDomain instance);
    Task UpdateCityInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateLocationInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateCityLocationsVisibilityAsync(Guid cityInstanceId, bool isVisibleToPlayers);
    Task UpdateCastInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers);
    Task UpdateLocationCastsVisibilityAsync(Guid locationInstanceId, bool isVisibleToPlayers);
    Task UpdateCastCustomItemsAsync(Guid instanceId, string itemsJson);
    Task UpdateLocationCustomItemsAsync(Guid instanceId, string itemsJson);
    Task UpdateCityInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task UpdateCastInstanceKeywordsAsync(Guid instanceId, string[] keywords);
    Task UpdateLocationInstanceKeywordsAsync(Guid instanceId, string[] keywords);
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

    public async Task UpdateCityInstanceAsync(CampaignCityInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.Condition,
            instance.Geography,
            instance.Climate,
            instance.Religion,
            instance.Vibe,
            instance.Languages,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_city_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_city_instances
              SET condition=@Condition, geography=@Geography, climate=@Climate,
                  religion=@Religion, vibe=@Vibe, languages=@Languages
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_city_instances", @params, rows);
    }

    public async Task UpdateCityInstanceVisibilityAsync(Guid instanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_city_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_city_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_city_instances", @params, rows);
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

    public async Task UpdateCityLocationsVisibilityAsync(Guid cityInstanceId, bool isVisibleToPlayers)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CityInstanceId = cityInstanceId, IsVisibleToPlayers = isVisibleToPlayers };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_location_instances
              SET is_visible_to_players=@IsVisibleToPlayers
              WHERE city_instance_id=@CityInstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params, rows);
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

    public async Task UpdateLocationCustomItemsAsync(Guid instanceId, string itemsJson)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Items = itemsJson };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_location_instances SET custom_items=@Items::jsonb WHERE instance_id=@InstanceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_location_instances", @params, rows);
    }

    public async Task UpdateCityInstanceKeywordsAsync(Guid instanceId, string[] keywords)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId, Keywords = keywords };
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_city_instances", @params);
        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "UPDATE campaign_city_instances SET keywords = @Keywords::text[] WHERE instance_id = @InstanceId",
            @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_city_instances", @params, rows);
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
}
