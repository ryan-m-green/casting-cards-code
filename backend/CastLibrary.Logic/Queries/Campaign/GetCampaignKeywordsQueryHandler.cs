using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignKeywordsQueryHandler
{
    Task<string[]> HandleAsync(Guid dmUserId, string? cardType);
}

public class GetCampaignKeywordsQueryHandler(
    ICampaignKeywordReadRepository campaignKeywordReadRepository) : IGetCampaignKeywordsQueryHandler
{
    public Task<string[]> HandleAsync(Guid dmUserId, string? cardType) =>
        campaignKeywordReadRepository.GetKeywordsAsync(dmUserId, cardType);
}
