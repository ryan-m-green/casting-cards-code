using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface ICampaignKeywordDeleteRepository
    {
        Task DeleteAsync(Guid dmUserId, string cardType, string keyword);
    }

    public class CampaignKeywordDeleteRepository(
        ISqlConnectionFactory sqlConnectionFactory) : ICampaignKeywordDeleteRepository
    {
        public async Task DeleteAsync(Guid dmUserId, string cardType, string keyword)
        {
            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(
                @"DELETE FROM campaign_keywords
                   WHERE dm_user_id = @DmUserId
                     AND card_type = @CardType
                     AND keyword = @Keyword",
                new { DmUserId = dmUserId, CardType = cardType, Keyword = keyword });
        }
    }
}
