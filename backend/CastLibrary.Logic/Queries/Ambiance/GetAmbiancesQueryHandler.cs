using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Ambiance;

public interface IGetAmbiancesQueryHandler
{
    Task<List<AmbianceDomain>> HandleAsync(GetAmbiancesQuery query);
}

public class GetAmbiancesQueryHandler(
    IAmbianceReadRepository readRepository) : IGetAmbiancesQueryHandler
{
    public async Task<List<AmbianceDomain>> HandleAsync(GetAmbiancesQuery query)
    {
        return await readRepository.GetByGmUserIdAsync(query.GmUserId);
    }
}

public class GetAmbiancesQuery
{
    public GetAmbiancesQuery(Guid gmUserId)
    {
        GmUserId = gmUserId;
    }

    public Guid GmUserId { get; }
}