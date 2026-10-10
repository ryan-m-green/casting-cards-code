using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Soundtrack;

public interface IGetSoundtracksQueryHandler
{
    Task<List<SoundtrackDomain>> HandleAsync(GetSoundtracksQuery query);
}

public class GetSoundtracksQueryHandler(
    ISoundtrackReadRepository readRepository) : IGetSoundtracksQueryHandler
{
    public async Task<List<SoundtrackDomain>> HandleAsync(GetSoundtracksQuery query)
    {
        return await readRepository.GetByGmUserIdAsync(query.GmUserId);
    }
}

public class GetSoundtracksQuery
{
    public GetSoundtracksQuery(Guid gmUserId)
    {
        GmUserId = gmUserId;
    }

    public Guid GmUserId { get; }
}