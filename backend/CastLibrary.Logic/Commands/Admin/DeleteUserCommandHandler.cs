using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Admin;

public interface IDeleteUserCommandHandler
{
    Task HandleAsync(Guid userId);
}

public class DeleteUserCommandHandler(IUserDeleteRepository userDeleteRepository, IImageStorageOperator imageStorageOperator) : IDeleteUserCommandHandler
{
    public async Task HandleAsync(Guid userId)
    {
        var taskList = new List<Task>()
        {              
            imageStorageOperator.DeleteUserDirectoryAsync(userId),// Delete user's image directory from storage            
            userDeleteRepository.DeleteUserAndAllDataAsync(userId)// Delete user and all database data
        };
        await Task.WhenAll(taskList);
    }
}
