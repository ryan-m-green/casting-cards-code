using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ISublocationInsertRepository
    {
        Task<SublocationDomain> InsertAsync(SublocationDomain sublocation);
    }
    public class SublocationInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISublocationInsertRepository
    {
        public async Task<SublocationDomain> InsertAsync(SublocationDomain sublocation)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                sublocation.Id,
                sublocation.LocationId,
                sublocation.DmUserId,
                sublocation.Name,
                sublocation.Description,
                sublocation.CreatedAt,
            };

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "sublocations", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            await conn.ExecuteAsync(
                "INSERT INTO sublocations (id, location_id, dm_user_id, name, description, created_at) VALUES (@Id, @LocationId, @DmUserId, @Name, @Description, @CreatedAt)",
                @params, tx);

            foreach (var item in sublocation.ShopItems)
            {
                item.Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id;
                item.SublocationId = sublocation.Id;
                await conn.ExecuteAsync(
                    "INSERT INTO sublocation_shop_items (id, sublocation_id, name, price, description, sort_order) VALUES (@Id, @SublocationId, @Name, @Price, @Description, @SortOrder)",
                    new { item.Id, item.SublocationId, item.Name, item.Price, item.Description, item.SortOrder }, tx);
            }

            await tx.CommitAsync();

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "sublocations",
                @params, 1 + sublocation.ShopItems.Count);
            return sublocation;
        }
    }
}

