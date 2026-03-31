using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCampaignInviteCodeQueryHandler
{
    Task<CampaignInviteCodeDomain?> HandleAsync(Guid campaignId);
}

public class GetCampaignInviteCodeQueryHandler(
    ICampaignInviteCodeDeleteRepository inviteCodeDeleteRepository,
    ICampaignInviteCodeReadRepository inviteCodeReadRepository) : IGetCampaignInviteCodeQueryHandler
{
    public async Task<CampaignInviteCodeDomain?> HandleAsync(Guid campaignId)
    {
        var code = await inviteCodeReadRepository.GetByCampaignAsync(campaignId);
        if (code is null) return null;
        if (code.ExpiresAt <= DateTime.UtcNow)
        {
            await inviteCodeDeleteRepository.DeleteByCampaignAsync(campaignId);
            return null;
        }
        return code;
    }
}
