using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.PlayerNotes;

public interface IGetAllPlayerNotesQueryHandler
{
    Task<List<PlayerNoteDomain>> HandleAsync(GetAllPlayerNotesQuery query);
}

public class GetAllPlayerNotesQueryHandler(IPlayerNotesReadRepository repository) : IGetAllPlayerNotesQueryHandler
{
    public async Task<List<PlayerNoteDomain>> HandleAsync(GetAllPlayerNotesQuery query)
    {
        return await repository.GetAllPlayerNotesAsync(query.CampaignId);
    }
}
