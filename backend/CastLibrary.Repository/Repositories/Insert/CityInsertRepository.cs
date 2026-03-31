using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ICityInsertRepository
    {
        Task<CityDomain> InsertAsync(CityDomain city);
    }
    public class CityInsertRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICityInsertRepository
    {
        public async Task<CityDomain> InsertAsync(CityDomain city)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                city.Id,
                city.DmUserId,
                city.Name,
                city.Classification,
                city.Size,
                city.Condition,
                city.Geography,
                city.Architecture,
                city.Climate,
                city.Religion,
                city.Vibe,
                city.Languages,
                city.Description,
                city.CreatedAt,
            };
            const string sql =
                @"INSERT INTO cities
                (id, dm_user_id, name, classification, size, condition, geography, architecture,
                 climate, religion, vibe, languages, description, created_at)
              VALUES
                (@Id, @DmUserId, @Name, @Classification, @Size, @Condition, @Geography,
                 @Architecture, @Climate, @Religion, @Vibe, @Languages, @Description, @CreatedAt)";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "cities", @params);

            using var conn = sqlConnectinFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "cities", @params, rows);
            return city;
        }
    }
}
