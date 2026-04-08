using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ISublocationUpdateRepository
    {
        Task<SublocationDomain> UpdateAsync(SublocationDomain sublocation);
    }
    public class SublocationUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISublocationUpdateRepository
    {
        public async Task<SublocationDomain> UpdateAsync(SublocationDomain sublocation)
        {
            var spanId = correlation.NewSpan();
            var @params = new { sublocation.Id, sublocation.LocationId, sublocation.Name, sublocation.Description };

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "sublocations", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            var rows = await conn.ExecuteAsync(
                "UPDATE sublocations SET location_id=@LocationId, name=@Name, description=@Description WHERE id=@Id",
                @params, tx);

            await conn.ExecuteAsync("DELETE FROM sublocation_shop_items WHERE sublocation_id = @Id",
                new { sublocation.Id }, tx);

            foreach (var item in sublocation.ShopItems)
            {
                item.Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id;
                item.SublocationId = sublocation.Id;
                await conn.ExecuteAsync(
                    "INSERT INTO sublocation_shop_items (id, sublocation_id, name, price, description, sort_order) VALUES (@Id, @SublocationId, @Name, @Price, @Description, @SortOrder)",
                    new { item.Id, item.SublocationId, item.Name, item.Price, item.Description, item.SortOrder }, tx);
            }

            await tx.CommitAsync();

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "sublocations", @params, rows);
            return sublocation;
        }
    }
}

