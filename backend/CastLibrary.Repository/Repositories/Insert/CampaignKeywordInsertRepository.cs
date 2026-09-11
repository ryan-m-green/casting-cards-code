using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface ICampaignKeywordInsertRepository
{
    Task MergeKeywordsAsync(Guid dmUserId, string cardType, string[] keywords);
}

public class CampaignKeywordInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory) : ICampaignKeywordInsertRepository
{
    public async Task MergeKeywordsAsync(Guid dmUserId, string cardType, string[] keywords)
    {
        if (keywords is null || keywords.Length == 0) return;

        var normalized = keywords
            .Select(k => k?.Trim().ToLowerInvariant())
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (normalized.Length == 0) return;

        using var conn = sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(
            @"INSERT INTO campaign_keywords (id, dm_user_id, card_type, keyword)
              SELECT gen_random_uuid(), @DmUserId, @CardType, kw
                FROM unnest(@Keywords::text[]) AS kw
              ON CONFLICT (dm_user_id, card_type, keyword) DO NOTHING",
            new { DmUserId = dmUserId, CardType = cardType, Keywords = normalized });
    }
}
