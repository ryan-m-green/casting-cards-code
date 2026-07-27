using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Soundtrack;

public interface IGetCampaignSoundtracksQueryHandler
{
    Task<List<SoundtrackDomain>> HandleAsync(GetCampaignSoundtracksQuery query);
}

public class GetCampaignSoundtracksQueryHandler(
    ISoundtrackReadRepository readRepository) : IGetCampaignSoundtracksQueryHandler
{
    public async Task<List<SoundtrackDomain>> HandleAsync(GetCampaignSoundtracksQuery query)
    {
        return await readRepository.GetByCampaignIdAsync(query.CampaignId);
    }
}

public class GetCampaignSoundtracksQuery
{
    public GetCampaignSoundtracksQuery(Guid campaignId)
    {
        CampaignId = campaignId;
    }

    public Guid CampaignId { get; }
}
