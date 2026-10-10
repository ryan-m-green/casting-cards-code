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

public interface IGetLibraryRulesQueryHandler
{
    Task<List<CampaignRuleDomain>> HandleAsync(Guid dmUserId);
}

/// <summary>Every cheat-sheet entry the DM owns — the Cheat Sheet Library page's shelf.</summary>
public class GetLibraryRulesQueryHandler(
    ICampaignRuleReadRepository readRepository) : IGetLibraryRulesQueryHandler
{
    public Task<List<CampaignRuleDomain>> HandleAsync(Guid dmUserId)
        => readRepository.GetByDmUserIdAsync(dmUserId);
}
