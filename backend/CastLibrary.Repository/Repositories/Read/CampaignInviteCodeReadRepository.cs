using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignInviteCodeReadRepository
{
    Task<CampaignInviteCodeDomain> GetByCampaignAsync(Guid campaignId);   
    Task<CampaignInviteCodeDomain> GetByCodeAsync(string code);
}

public class CampaignInviteCodeReadRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignInviteCodeEntityMapper mapper) : ICampaignInviteCodeReadRepository
{
    public async Task<CampaignInviteCodeDomain> GetByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT campaign_id AS CampaignId, 
                 code, expires_at AS ExpiresAt
                 FROM campaign_invite_codes
                WHERE campaign_id = @CampaignId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_invite_codes", @params);

        using var conn = connectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CampaignInviteCodeEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_invite_codes",
            @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<CampaignInviteCodeDomain> GetByCodeAsync(string code)
    {
        var spanId = correlation.NewSpan();
        var @params = new { Code = code };

        const string sql =
            @"SELECT campaign_id AS CampaignId, 
                 code, expires_at AS ExpiresAt
                 FROM campaign_invite_codes
                 WHERE code = @Code AND expires_at > NOW()";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_invite_codes", @params);

        using var conn = connectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<CampaignInviteCodeEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_invite_codes",
            @params, entity is null ? 0 : 1);

        return entity is null ? null : mapper.ToDomain(entity);
    }
}