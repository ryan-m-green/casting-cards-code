using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Admin;

public interface IDeleteUserCommandHandler
{
    Task HandleAsync(Guid userId);
}

public class DeleteUserCommandHandler(IUserDeleteRepository userDeleteRepository) : IDeleteUserCommandHandler
{
    public async Task HandleAsync(Guid userId)
    {
        await userDeleteRepository.DeleteUserAndAllDataAsync(userId);
    }
}
