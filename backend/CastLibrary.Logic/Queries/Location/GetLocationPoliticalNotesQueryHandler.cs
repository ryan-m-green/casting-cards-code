using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Location;

public interface IGetLocationPoliticalNotesQueryHandler
{
    Task<LocationPoliticalNotesDomain> HandleAsync(Guid campaignId, Guid LocationInstanceId);
}

public class GetLocationPoliticalNotesQueryHandler(
    ILocationPoliticalNotesReadRepository repository) : IGetLocationPoliticalNotesQueryHandler
{
    public Task<LocationPoliticalNotesDomain> HandleAsync(Guid campaignId, Guid LocationInstanceId) =>
        repository.GetByLocationInstanceAsync(campaignId, LocationInstanceId);
}

