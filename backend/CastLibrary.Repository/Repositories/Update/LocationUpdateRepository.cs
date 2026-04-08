using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ILocationUpdateRepository
    {
        Task<LocationDomain> UpdateAsync(LocationDomain Location);
    }
    public class LocationUpdateRepository(
    ISqlConnectionFactory sqlConnectinFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ILocationUpdateRepository
    {
        public async Task<LocationDomain> UpdateAsync(LocationDomain Location)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                Location.Id,
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
            };
            const string sql =
                @"UPDATE locations
              SET name=@Name, classification=@Classification, size=@Size, condition=@Condition,
                  geography=@Geography, architecture=@Architecture, climate=@Climate,
                  religion=@Religion, vibe=@Vibe, languages=@Languages, description=@Description
              WHERE id=@Id";

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "locations", @params);

            using var conn = sqlConnectinFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "locations", @params, rows);
            return Location;
        }
    }
}


