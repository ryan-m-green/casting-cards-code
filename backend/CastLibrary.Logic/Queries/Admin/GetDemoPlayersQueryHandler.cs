using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetDemoPlayersQueryHandler
{
    Task<List<Guid>> HandleAsync();
}

public class GetDemoPlayersQueryHandler(ICampaignPlayerReadRepository playerReadRepository) : IGetDemoPlayersQueryHandler
{
    public async Task<List<Guid>> HandleAsync()
    {
        return await playerReadRepository.GetDemoPlayerUserIdsAsync();
    }
}
