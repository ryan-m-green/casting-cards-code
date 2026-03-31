using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IAdminInviteCodeReadRepository
{
    Task<AdminInviteCodeDomain?> GetCurrentAsync();
}

public class AdminInviteCodeReadRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    IAdminInviteCodeEntityMapper mapper) : IAdminInviteCodeReadRepository
{
    public async Task<AdminInviteCodeDomain?> GetCurrentAsync()
    {
        var spanId = correlation.NewSpan();
        const string sql =
            @"SELECT id, code, expires_at AS ExpiresAt, created_at AS CreatedAt
                FROM admin_invite_codes
               LIMIT 1";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "admin_invite_codes", null);

        using var conn = connectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<AdminInviteCodeEntity>(sql);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "admin_invite_codes",
            null, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }
}
