using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignLocationInstanceReadRepository
{
    Task<CampaignLocationInstanceDomain> GetByIdAsync(Guid instanceId);
}

public class CampaignLocationInstanceReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignLocationInstanceReadRepository
{
    public async Task<CampaignLocationInstanceDomain> GetByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };
        const string sql =
            @"SELECT instance_id AS InstanceId,
                     campaign_id AS CampaignId,
                     name,
                     description
              FROM campaign_location_instances
              WHERE instance_id = @InstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_instances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var record = await conn.QueryFirstOrDefaultAsync<CampaignLocationInstanceDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_location_instances",
            @params, record is null ? 0 : 1);

        if (record is null) return null;
        return record;
    }
}
