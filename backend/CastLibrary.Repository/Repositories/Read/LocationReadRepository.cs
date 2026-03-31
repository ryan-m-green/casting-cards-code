using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ILocationReadRepository
{
    Task<List<LocationDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<LocationDomain> GetByIdAsync(Guid id);    
}
public class LocationReadRepository(
    ISqlConnectionFactory      sqlConnectionFactory,
    ILoggingService     logging,
    ICorrelationContext correlation) : ILocationReadRepository
{
    public async Task<List<LocationDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT id, city_id AS CityId, dm_user_id AS DmUserId,
                     name, description, created_at AS CreatedAt
              FROM locations WHERE dm_user_id = @DmUserId ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var locations = (await conn.QueryAsync<LocationDomain>(sql, @params)).ToList();

        if (locations.Count == 0)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params, 0);
            return locations;
        }

        var locationIds = locations.Select(l => l.Id).ToArray();
        var shopItems = (await conn.QueryAsync<ShopItemDomain>(
            @"SELECT id, location_id AS LocationId, name, price, description, sort_order AS SortOrder
              FROM location_shop_items WHERE location_id = ANY(@Ids) ORDER BY sort_order",
            new { Ids = locationIds })).ToList();

        foreach (var location in locations)
            location.ShopItems = shopItems.Where(s => s.LocationId == location.Id).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params, locations.Count);
        return locations;
    }

    public async Task<LocationDomain> GetByIdAsync(Guid id)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, city_id AS CityId, dm_user_id AS DmUserId,
                     name, description, created_at AS CreatedAt
              FROM locations WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var location = await conn.QueryFirstOrDefaultAsync<LocationDomain>(sql, @params);

        if (location is null)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params, 0);
            return null;
        }

        location.ShopItems = (await conn.QueryAsync<ShopItemDomain>(
            @"SELECT id, location_id AS LocationId, name, price, description, sort_order AS SortOrder
              FROM location_shop_items WHERE location_id = @LocationId ORDER BY sort_order",
            new { LocationId = id })).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "locations", @params, 1);
        return location;
    }
}
