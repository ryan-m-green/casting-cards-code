using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ICampaignRuleUpdateRepository
{
    Task<CampaignRuleDomain> UpdateAsync(CampaignRuleDomain domain);
}

public class CampaignRuleUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignRuleEntityMapper mapper) : ICampaignRuleUpdateRepository
{
    public async Task<CampaignRuleDomain> UpdateAsync(CampaignRuleDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.DmUserId,
            domain.Name,
            domain.Definition,
            Children = CampaignRuleEntityMapper.ToJson(domain.Children),
            Keywords = domain.Keywords.ToArray(),
            domain.UpdatedAt,
        };

        const string sql =
            @"UPDATE campaign_rules
              SET    name       = @Name,
                     definition = @Definition,
                     children   = @Children::jsonb,
                     keywords   = @Keywords,
                     updated_at = @UpdatedAt
              WHERE  id         = @Id
                AND  dm_user_id = @DmUserId
              RETURNING id,
                        dm_user_id  AS DmUserId,
                        name,
                        definition,
                        children    AS Children,
                        keywords    AS Keywords,
                        created_at  AS CreatedAt,
                        updated_at  AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstOrDefaultAsync<CampaignRuleEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_rules",
            @params, row is null ? 0 : 1);

        return row is null ? null : mapper.ToDomain(row);
    }
}
