using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ISublocationReadRepository
{
    Task<List<SublocationDomain>> GetAllByDmAsync(Guid dmUserId);
    Task<SublocationDomain> GetByIdAsync(Guid id);
}
public class SublocationReadRepository(
    ISqlConnectionFactory      sqlConnectionFactory,
    ILoggingService     logging,
    ICorrelationContext correlation) : ISublocationReadRepository
{
    public async Task<List<SublocationDomain>> GetAllByDmAsync(Guid dmUserId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { DmUserId = dmUserId };
        const string sql =
            @"SELECT id, city_id AS CityId, dm_user_id AS DmUserId,
                     name, description, created_at AS CreatedAt
              FROM sublocations WHERE dm_user_id = @DmUserId ORDER BY name";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "sublocations", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var sublocations = (await conn.QueryAsync<SublocationDomain>(sql, @params)).ToList();

        if (sublocations.Count == 0)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "sublocations", @params, 0);
            return sublocations;
        }

        var sublocationIds = sublocations.Select(l => l.Id).ToArray();
        var shopItems = (await conn.QueryAsync<ShopItemDomain>(
            @"SELECT id, sublocation_id AS SublocationId, name, price, description, sort_order AS SortOrder
              FROM sublocation_shop_items WHERE sublocation_id = ANY(@Ids) ORDER BY sort_order",
            new { Ids = sublocationIds })).ToList();

        foreach (var sublocation in sublocations)
            sublocation.ShopItems = shopItems.Where(s => s.SublocationId == sublocation.Id).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "sublocations", @params, sublocations.Count);
        return sublocations;
    }

    public async Task<SublocationDomain> GetByIdAsync(Guid id)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { Id = id };
        const string sql =
            @"SELECT id, city_id AS CityId, dm_user_id AS DmUserId,
                     name, description, created_at AS CreatedAt
              FROM sublocations WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "sublocations", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var sublocation = await conn.QueryFirstOrDefaultAsync<SublocationDomain>(sql, @params);

        if (sublocation is null)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "sublocations", @params, 0);
            return null;
        }

        sublocation.ShopItems = (await conn.QueryAsync<ShopItemDomain>(
            @"SELECT id, sublocation_id AS SublocationId, name, price, description, sort_order AS SortOrder
              FROM sublocation_shop_items WHERE sublocation_id = @SublocationId ORDER BY sort_order",
            new { SublocationId = id })).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "sublocations", @params, 1);
        return sublocation;
    }
}
