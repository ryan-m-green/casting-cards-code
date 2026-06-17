using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetDemoPlayersQueryHandler
{
    Task<Dictionary<Guid, Guid>> HandleAsync();
}

public class GetDemoPlayersQueryHandler(ICampaignPlayerReadRepository playerReadRepository) : IGetDemoPlayersQueryHandler
{
    public async Task<Dictionary<Guid, Guid>> HandleAsync()
    {
        return await playerReadRepository.GetDemoPlayerAssignmentsAsync();
    }
}
