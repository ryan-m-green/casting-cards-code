using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetCastRelationshipByIdQueryHandler
{
    Task<CampaignCastRelationshipDomain> HandleAsync(Guid id);
}

public class GetCastRelationshipByIdQueryHandler(
    ICampaignCastRelationshipReadRepository repository) : IGetCastRelationshipByIdQueryHandler
{
    public async Task<CampaignCastRelationshipDomain> HandleAsync(Guid id) =>
        await repository.GetByIdAsync(id);
}
