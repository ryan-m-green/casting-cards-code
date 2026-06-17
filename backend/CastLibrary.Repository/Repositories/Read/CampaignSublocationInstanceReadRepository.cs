using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignSublocationInstanceReadRepository
{
    Task<CampaignSublocationInstanceDomain> GetByIdAsync(Guid instanceId);
}

public class CampaignSublocationInstanceReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignSublocationInstanceReadRepository
{
    public async Task<CampaignSublocationInstanceDomain> GetByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };
        const string sql =
            @"SELECT instance_id AS InstanceId,
                     campaign_id AS CampaignId,
                     name,
                     description
              FROM campaign_sublocation_instances
              WHERE instance_id = @InstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var record = await conn.QueryFirstOrDefaultAsync<CampaignSublocationInstanceDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_sublocation_instances",
            @params, record is null ? 0 : 1);

        if (record is null) return null;
        return record;
    }
}
