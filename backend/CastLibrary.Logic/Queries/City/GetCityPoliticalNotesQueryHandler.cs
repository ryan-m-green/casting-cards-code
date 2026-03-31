using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.City;

public interface IGetCityPoliticalNotesQueryHandler
{
    Task<CityPoliticalNotesDomain> HandleAsync(Guid campaignId, Guid cityInstanceId);
}

public class GetCityPoliticalNotesQueryHandler(
    ICityPoliticalNotesReadRepository repository) : IGetCityPoliticalNotesQueryHandler
{
    public Task<CityPoliticalNotesDomain> HandleAsync(Guid campaignId, Guid cityInstanceId) =>
        repository.GetByCityInstanceAsync(campaignId, cityInstanceId);
}
