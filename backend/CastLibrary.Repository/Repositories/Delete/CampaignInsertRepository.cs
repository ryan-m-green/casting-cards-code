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
    Task<CampaignCityInstanceDomain> InsertCityInstanceAsync(CampaignCityInstanceDomain instance);
    Task<CampaignLocationInstanceDomain> InsertLocationInstanceAsync(CampaignLocationInstanceDomain instance);
    Task<ShopItemDomain> InsertLocationShopItemAsync(Guid locationInstanceId, ShopItemDomain item);
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
            campaign.CreatedAt,
        };
        const string sql =
            @"INSERT INTO campaigns
                (id, dm_user_id, name, description, fantasy_type, status, spine_color, created_at)
              VALUES
                (@Id, @DmUserId, @Name, @Description, @FantasyType, @Status, @SpineColor, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaigns", @params, rows);
        return campaign;
    }

    public async Task<CampaignCityInstanceDomain> InsertCityInstanceAsync(CampaignCityInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.CampaignId,
            instance.SourceCityId,
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
        };
        const string sql =
            @"INSERT INTO campaign_city_instances
                (instance_id, campaign_id, source_city_id, name, classification, size, condition,
                 geography, architecture, climate, religion, vibe, languages, description,
                 is_visible_to_players, sort_order, created_at)
              VALUES
                (@InstanceId, @CampaignId, @SourceCityId, @Name, @Classification, @Size, @Condition,
                 @Geography, @Architecture, @Climate, @Religion, @Vibe, @Languages, @Description,
                 @IsVisibleToPlayers, @SortOrder, NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_city_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_city_instances", @params, rows);
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
            instance.CityInstanceId,
            instance.LocationInstanceId,
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
                (instance_id, campaign_id, source_cast_id, city_instance_id, location_instance_id,
                 name, pronouns, race, role, age, alignment, posture, speed, voice_placement,
                 description, public_description, is_visible_to_players, created_at)
              VALUES
                (@InstanceId, @CampaignId, @SourceCastId, @CityInstanceId, @LocationInstanceId,
                 @Name, @Pronouns, @Race, @Role, @Age, @Alignment, @Posture, @Speed,
                 @VoicePlacement::text[], @Description, @PublicDescription, @IsVisibleToPlayers, NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_cast_instances", @params, rows);
        return instance;
    }

    public async Task<CampaignLocationInstanceDomain> InsertLocationInstanceAsync(CampaignLocationInstanceDomain instance)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            instance.InstanceId,
            instance.CampaignId,
            instance.SourceLocationId,
            instance.CityInstanceId,
            instance.Name,
            instance.Description,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_location_instances", @params);

        using var conn = CreateConnection();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        await conn.ExecuteAsync(
            @"INSERT INTO campaign_location_instances
                (instance_id, campaign_id, source_location_id, city_instance_id,
                 name, description, created_at)
              VALUES
                (@InstanceId, @CampaignId, @SourceLocationId, @CityInstanceId,
                 @Name, @Description, NOW())",
            @params, tx);

        foreach (var item in instance.ShopItems)
        {
            await conn.ExecuteAsync(
                @"INSERT INTO campaign_location_shop_items
                    (id, location_instance_id, name, price, description, sort_order)
                  VALUES
                    (@Id, @LocationInstanceId, @Name, @Price, @Description, @SortOrder)",
                new
                {
                    Id = Guid.NewGuid(),
                    LocationInstanceId = instance.InstanceId,
                    item.Name,
                    item.Price,
                    item.Description,
                    item.SortOrder,
                }, tx);
        }

        await tx.CommitAsync();

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_location_instances",
            @params, 1 + instance.ShopItems.Count);

        return instance;
    }

    public async Task<ShopItemDomain> InsertLocationShopItemAsync(Guid locationInstanceId, ShopItemDomain item)
    {
        var spanId = correlation.NewSpan();
        item.Id = Guid.NewGuid();
        item.LocationId = locationInstanceId;

        var @params = new
        {
            Id = item.Id,
            LocationInstanceId = locationInstanceId,
            item.Name,
            item.Price,
            item.Description,
            item.SortOrder,
        };

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_location_shop_items", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"INSERT INTO campaign_location_shop_items
                (id, location_instance_id, name, price, description, sort_order)
              VALUES
                (@Id, @LocationInstanceId, @Name, @Price, @Description, @SortOrder)",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_location_shop_items", @params, rows);
        return item;
    }
}
