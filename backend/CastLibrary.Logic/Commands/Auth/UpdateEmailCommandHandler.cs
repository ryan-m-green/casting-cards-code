using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Auth;

public interface IUpdateEmailCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(UpdateEmailCommand command);
}

public class UpdateEmailCommandHandler(
    IUserReadRepository userReadRepository,
    IUserUpdateRepository userUpdateRepository) : IUpdateEmailCommandHandler
{
    public async Task<(bool Success, string Error)> HandleAsync(UpdateEmailCommand command)
    {
        var user = await userReadRepository.GetByIdAsync(command.UserId);
        if (user is null)
            return (false, "User not found.");

        // Check if email already exists
        var existingUser = await userReadRepository.GetByEmailAsync(command.Request.Email);
        if (existingUser is not null && existingUser.Id != command.UserId)
            return (false, "Email already in use.");

        await userUpdateRepository.UpdateEmailAsync(command.UserId, command.Request.Email);

        return (true, null);
    }
}

public class UpdateEmailCommand
{
    public UpdateEmailCommand(Guid userId, UpdateEmailRequest request)
    {
        UserId = userId;
        Request = request;
    }

    public Guid UserId { get; }
    public UpdateEmailRequest Request { get; }
}
