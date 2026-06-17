using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.Repository.Repositories.Update;

public interface IUserWriteRepository
{
    Task UpdateLastLoggedInOnAsync(Guid userId);
}

public class UserWriteRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : IUserWriteRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task UpdateLastLoggedInOnAsync(Guid userId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { UserId = userId };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "users", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE users
              SET last_logged_in_on = NOW()
              WHERE id = @UserId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "users", @params, rows);
    }
}
