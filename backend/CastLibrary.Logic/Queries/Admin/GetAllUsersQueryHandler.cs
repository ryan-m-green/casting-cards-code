using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetAllUsersQueryHandler
{
    Task<List<UserManagementResponse>> HandleAsync();
}

public class GetAllUsersQueryHandler(IUserReadRepository userReadRepository) : IGetAllUsersQueryHandler
{
    public async Task<List<UserManagementResponse>> HandleAsync()
    {
        return await userReadRepository.GetAllUsersWithSubscriptionAsync();
    }
}
