using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

/// <summary>
/// The campaign's factions as the party's own row reads them: every faction the campaign holds,
/// wearing the party's own cast membership rather than the GM's. It is what the GM's party view
/// and a player's own faction row are both drawn from (see cc-card-faction-navigation): one read,
/// so the GM looking over the party's shoulder sees exactly the row the party sees.
/// </summary>
public interface IGetPartyCampaignFactionInstancesQueryHandler
{
    Task<List<CampaignFactionInstanceDomain>> HandleAsync(Guid campaignId);
}

public class GetPartyCampaignFactionInstancesQueryHandler(
    ICampaignReadRepository campaignReadRepository) : IGetPartyCampaignFactionInstancesQueryHandler
{
    public async Task<List<CampaignFactionInstanceDomain>> HandleAsync(Guid campaignId)
    {
        return await campaignReadRepository.GetFactionInstancesForPartyAsync(campaignId);
    }
}