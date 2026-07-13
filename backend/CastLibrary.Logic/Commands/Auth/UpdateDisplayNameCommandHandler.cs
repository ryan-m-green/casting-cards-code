using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Auth;

public interface IUpdateDisplayNameCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(UpdateDisplayNameCommand command);
}

public class UpdateDisplayNameCommandHandler(
    IUserReadRepository userReadRepository,
    IUserUpdateRepository userUpdateRepository) : IUpdateDisplayNameCommandHandler
{
    public async Task<(bool Success, string Error)> HandleAsync(UpdateDisplayNameCommand command)
    {
        var user = await userReadRepository.GetByIdAsync(command.UserId);
        if (user is null)
            return (false, "User not found.");

        await userUpdateRepository.UpdateDisplayNameAsync(command.UserId, command.Request.DisplayName);

        return (true, null);
    }
}

public class UpdateDisplayNameCommand
{
    public UpdateDisplayNameCommand(Guid userId, UpdateDisplayNameRequest request)
    {
        UserId = userId;
        Request = request;
    }

    public Guid UserId { get; }
    public UpdateDisplayNameRequest Request { get; }
}
