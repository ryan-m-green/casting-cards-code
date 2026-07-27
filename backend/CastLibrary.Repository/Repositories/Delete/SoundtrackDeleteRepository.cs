using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface ISoundtrackDeleteRepository
{
    Task DeleteAsync(Guid soundtrackId);
}

public class SoundtrackDeleteRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISoundtrackDeleteRepository
{
    public async Task DeleteAsync(Guid soundtrackId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SoundtrackId = soundtrackId };
        
        const string sql = @"DELETE FROM campaign_soundtracks WHERE id = @SoundtrackId";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_soundtracks", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rowsAffected = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_soundtracks", @params, rowsAffected);
    }
}
