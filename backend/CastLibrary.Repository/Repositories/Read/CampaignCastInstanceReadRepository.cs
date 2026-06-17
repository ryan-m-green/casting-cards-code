using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignCastInstanceReadRepository
{
    Task<CampaignCastInstanceDomain> GetByIdAsync(Guid instanceId);
}

public class CampaignCastInstanceReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignCastInstanceReadRepository
{
    public async Task<CampaignCastInstanceDomain> GetByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };
        const string sql =
            @"SELECT instance_id AS InstanceId,
                     campaign_id AS CampaignId,
                     name,
                     race,
                     role,
                     public_description AS PublicDescription,
              FROM campaign_cast_instances
              WHERE instance_id = @InstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var record = await conn.QueryFirstOrDefaultAsync<CampaignCastInstanceDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_cast_instances",
            @params, record is null ? 0 : 1);

        if (record is null) return null;
        return record;
    }
}
