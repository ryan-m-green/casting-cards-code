using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ILocationInsertRepository
    {
        Task<LocationDomain> InsertAsync(LocationDomain Location);
    }
    public class LocationInsertRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ILocationInsertRepository
    {
        public async Task<LocationDomain> InsertAsync(LocationDomain Location)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                Location.Id,
                Location.DmUserId,
                Location.Name,
                Location.Classification,
                Location.Size,
                Location.Condition,
                Location.Geography,
                Location.Architecture,
                Location.Climate,
                Location.Religion,
                Location.Vibe,
                Location.Languages,
                Location.Description,
                Location.CreatedAt,
            };
            const string sql =
                @"INSERT INTO locations
                (id, dm_user_id, name, classification, size, condition, geography, architecture,
                 climate, religion, vibe, languages, description, created_at)
              VALUES
                (@Id, @DmUserId, @Name, @Classification, @Size, @Condition, @Geography,
                 @Architecture, @Climate, @Religion, @Vibe, @Languages, @Description, @CreatedAt)";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "locations", @params);

            using var conn = sqlConnectinFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "locations", @params, rows);
            return Location;
        }
    }
}


