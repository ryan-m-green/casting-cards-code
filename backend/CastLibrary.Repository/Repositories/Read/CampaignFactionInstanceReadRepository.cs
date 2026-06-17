using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignFactionInstanceReadRepository
{
    Task<CampaignFactionInstanceDomain> GetByIdAsync(Guid instanceId);
}

public class CampaignFactionInstanceReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignFactionInstanceReadRepository
{
    public async Task<CampaignFactionInstanceDomain> GetByIdAsync(Guid instanceId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { InstanceId = instanceId };
        const string sql =
            @"SELECT faction_instance_id AS FactionInstanceId,
                     campaign_id AS CampaignId,
                     name as Name,
                     type as Type,
                     description AS Description
              FROM campaign_faction_instances
              WHERE faction_instance_id = @InstanceId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_faction_instances", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var record = await conn.QueryFirstOrDefaultAsync<CampaignFactionInstanceDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_faction_instances",
            @params, record is null ? 0 : 1);

        if (record is null) return null;
        return record;
    }
}
