using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignDeleteRepository
{
    Task DeleteAsync(Guid id);
    Task DeleteCityInstanceAsync(Guid instanceId);
    Task DeleteCastInstanceAsync(Guid instanceId);
    Task DeleteSublocationInstanceAsync(Guid instanceId);
}

public class CampaignDeleteRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignDeleteRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task DeleteAsync(Guid id)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Id = id };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaigns", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync("DELETE FROM campaigns WHERE id = @Id", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaigns", @params, rows);
    }

    public async Task DeleteCityInstanceAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_city_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_city_instances WHERE instance_id=@InstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_city_instances", @params, rows);
    }

    public async Task DeleteCastInstanceAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_cast_instances WHERE instance_id=@InstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_cast_instances", @params, rows);
    }

    public async Task DeleteSublocationInstanceAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_sublocation_instances", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            "DELETE FROM campaign_sublocation_instances WHERE instance_id = @InstanceId", @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "campaign_sublocation_instances", @params, rows);
    }
}
