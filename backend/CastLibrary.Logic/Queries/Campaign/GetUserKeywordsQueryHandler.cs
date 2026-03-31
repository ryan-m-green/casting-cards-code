using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetUserKeywordsQueryHandler
{
    Task<string[]> HandleAsync(Guid userId);
}

public class GetUserKeywordsQueryHandler(IUserReadRepository userReadRepository) : IGetUserKeywordsQueryHandler
{
    public Task<string[]> HandleAsync(Guid userId) =>
        userReadRepository.GetKeywordsAsync(userId);
}
