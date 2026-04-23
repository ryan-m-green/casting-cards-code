using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetAllUsersQueryHandler
{
    Task<List<UserDomain>> HandleAsync();
}

public class GetAllUsersQueryHandler(IUserReadRepository userReadRepository) : IGetAllUsersQueryHandler
{
    public async Task<List<UserDomain>> HandleAsync()
    {
        return await userReadRepository.GetAllUsersAsync();
    }
}
