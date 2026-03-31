using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ILocationInsertRepository
    {
        Task<LocationDomain> InsertAsync(LocationDomain location);
    }
    public class LocationInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ILocationInsertRepository
    {
        public async Task<LocationDomain> InsertAsync(LocationDomain location)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                location.Id,
                location.CityId,
                location.DmUserId,
                location.Name,
                location.Description,
                location.CreatedAt,
            };

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "locations", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            await conn.ExecuteAsync(
                "INSERT INTO locations (id, city_id, dm_user_id, name, description, created_at) VALUES (@Id, @CityId, @DmUserId, @Name, @Description, @CreatedAt)",
                @params, tx);

            foreach (var item in location.ShopItems)
            {
                item.Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id;
                item.LocationId = location.Id;
                await conn.ExecuteAsync(
                    "INSERT INTO location_shop_items (id, location_id, name, price, description, sort_order) VALUES (@Id, @LocationId, @Name, @Price, @Description, @SortOrder)",
                    new { item.Id, item.LocationId, item.Name, item.Price, item.Description, item.SortOrder }, tx);
            }

            await tx.CommitAsync();

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "locations",
                @params, 1 + location.ShopItems.Count);
            return location;
        }
    }
}
