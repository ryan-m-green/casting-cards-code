using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignRuleInsertRepository
{
    Task<CampaignRuleDomain> InsertAsync(CampaignRuleDomain domain);
}

public class CampaignRuleInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ICampaignRuleEntityMapper mapper) : ICampaignRuleInsertRepository
{
    public async Task<CampaignRuleDomain> InsertAsync(CampaignRuleDomain domain)
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
            domain.CreatedAt,
            domain.UpdatedAt,
        };

        const string sql =
            @"INSERT INTO campaign_rules
                (id, dm_user_id, name, definition, children, keywords, created_at, updated_at)
              VALUES
                (@Id, @DmUserId, @Name, @Definition, @Children::jsonb, @Keywords, @CreatedAt, @UpdatedAt)
              RETURNING id,
                        dm_user_id  AS DmUserId,
                        name,
                        definition,
                        children    AS Children,
                        keywords    AS Keywords,
                        created_at  AS CreatedAt,
                        updated_at  AS UpdatedAt";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_rules", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<CampaignRuleEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_rules", @params, 1);

        return mapper.ToDomain(row);
    }
}
