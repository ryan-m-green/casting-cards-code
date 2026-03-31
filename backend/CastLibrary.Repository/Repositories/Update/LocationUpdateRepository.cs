using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ILocationUpdateRepository
    {
        Task<LocationDomain> UpdateAsync(LocationDomain location);
    }
    public class LocationUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ILocationUpdateRepository
    {
        public async Task<LocationDomain> UpdateAsync(LocationDomain location)
        {
            var spanId = correlation.NewSpan();
            var @params = new { location.Id, location.CityId, location.Name, location.Description };

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "locations", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            var rows = await conn.ExecuteAsync(
                "UPDATE locations SET city_id=@CityId, name=@Name, description=@Description WHERE id=@Id",
                @params, tx);

            await conn.ExecuteAsync("DELETE FROM location_shop_items WHERE location_id = @Id",
                new { location.Id }, tx);

            foreach (var item in location.ShopItems)
            {
                item.Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id;
                item.LocationId = location.Id;
                await conn.ExecuteAsync(
                    "INSERT INTO location_shop_items (id, location_id, name, price, description, sort_order) VALUES (@Id, @LocationId, @Name, @Price, @Description, @SortOrder)",
                    new { item.Id, item.LocationId, item.Name, item.Price, item.Description, item.SortOrder }, tx);
            }

            await tx.CommitAsync();

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "locations", @params, rows);
            return location;
        }
    }
}
