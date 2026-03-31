using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ICityUpdateRepository
    {
        Task<CityDomain> UpdateAsync(CityDomain city);
    }
    public class CityUpdateRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICityUpdateRepository
    {
        public async Task<CityDomain> UpdateAsync(CityDomain city)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                city.Id,
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
            };
            const string sql =
                @"UPDATE cities
              SET name=@Name, classification=@Classification, size=@Size, condition=@Condition,
                  geography=@Geography, architecture=@Architecture, climate=@Climate,
                  religion=@Religion, vibe=@Vibe, languages=@Languages, description=@Description
              WHERE id=@Id";

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "cities", @params);

            using var conn = sqlConnectinFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "cities", @params, rows);
            return city;
        }
    }
}
