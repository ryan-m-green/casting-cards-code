using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface ICampaignKeywordReadRepository
{
    Task<string[]> GetKeywordsAsync(Guid dmUserId, string cardType);
}

public class CampaignKeywordReadRepository(
    ISqlConnectionFactory sqlConnectionFactory) : ICampaignKeywordReadRepository
{
    public async Task<string[]> GetKeywordsAsync(Guid dmUserId, string cardType)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryAsync<string>(
            @"SELECT keyword
                FROM campaign_keywords
               WHERE dm_user_id = @DmUserId
                 AND (@CardType IS NULL OR card_type = @CardType)
               ORDER BY keyword",
            new { DmUserId = dmUserId, CardType = cardType });

        return result.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }
}
