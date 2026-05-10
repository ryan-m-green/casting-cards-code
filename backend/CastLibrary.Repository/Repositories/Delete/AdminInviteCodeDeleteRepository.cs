using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete;

public interface IAdminInviteCodeDeleteRepository
{
    Task DeleteAsync();
}

public class AdminInviteCodeDeleteRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IAdminInviteCodeDeleteRepository
{
    public async Task DeleteAsync()
    {
        var spanId = correlation.NewSpan();
        const string sql = @"DELETE FROM admin_invite_codes";

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "admin_invite_codes", null);

        using var conn = connectionFactory.GetConnection();
        await conn.ExecuteAsync(sql);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "admin_invite_codes", null, 1);
    }
}
