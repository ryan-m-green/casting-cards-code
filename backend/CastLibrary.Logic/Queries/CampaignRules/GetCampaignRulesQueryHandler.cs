using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.CampaignRules;

public interface IGetCampaignRulesQueryHandler
{
    Task<List<CampaignRuleDomain>> HandleAsync(Guid campaignId);
}

public class GetCampaignRulesQueryHandler(
    ICampaignRuleReadRepository readRepository) : IGetCampaignRulesQueryHandler
{
    public Task<List<CampaignRuleDomain>> HandleAsync(Guid campaignId)
        => readRepository.GetByCampaignAsync(campaignId);
}

public interface IGetAvailableCampaignRulesQueryHandler
{
    Task<List<CampaignRuleDomain>> HandleAsync(Guid campaignId, Guid dmUserId);
}

public class GetAvailableCampaignRulesQueryHandler(
    ICampaignRuleReadRepository readRepository) : IGetAvailableCampaignRulesQueryHandler
{
    public Task<List<CampaignRuleDomain>> HandleAsync(Guid campaignId, Guid dmUserId)
        => readRepository.GetAvailableAsync(campaignId, dmUserId);
}
