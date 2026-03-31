using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCastRelationshipsQueryHandler
{
    Task<List<CampaignCastRelationshipDomain>> HandleAsync(Guid campaignId, Guid? sourceCastInstanceId = null);
}

public class GetCastRelationshipsQueryHandler(
    ICampaignCastRelationshipReadRepository repository) : IGetCastRelationshipsQueryHandler
{
    public async Task<List<CampaignCastRelationshipDomain>> HandleAsync(
        Guid campaignId, Guid? sourceCastInstanceId = null)
    {
        if (sourceCastInstanceId.HasValue)
            return await repository.GetBySourceCastInstanceAsync(campaignId, sourceCastInstanceId.Value);

        return await repository.GetByCampaignAsync(campaignId);
    }
}
