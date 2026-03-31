using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IAdminInviteCodeUpdateRepository
{
    Task UpsertAsync(AdminInviteCodeDomain code);
}

public class AdminInviteCodeUpdateRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IAdminInviteCodeUpdateRepository
{
    public async Task UpsertAsync(AdminInviteCodeDomain code)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            Id = code.Id,
            Code = code.Code,
            ExpiresAt = code.ExpiresAt,
        };

        const string sql =
            @"DELETE FROM admin_invite_codes;
              INSERT INTO admin_invite_codes (id, code, expires_at)
              VALUES (@Id, @Code, @ExpiresAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "admin_invite_codes", @params);

        using var conn = connectionFactory.GetConnection();
        await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "admin_invite_codes", @params, 1);
    }
}
