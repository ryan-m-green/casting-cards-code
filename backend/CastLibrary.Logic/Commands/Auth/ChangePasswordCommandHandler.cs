using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Auth;

public interface IChangePasswordCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(ChangePasswordCommand command);
}

public class ChangePasswordCommandHandler(
    IUserReadRepository userReadRepository,
    IUserUpdateRepository userUpdateRepository,
    IPasswordHashingService passwordHashingService) : IChangePasswordCommandHandler
{
    public async Task<(bool Success, string Error)> HandleAsync(ChangePasswordCommand command)
    {
        var user = await userReadRepository.GetByIdAsync(command.UserId);
        if (user is null)
            return (false, "User not found.");

        if (!passwordHashingService.Verify(command.Request.CurrentPassword, user.PasswordHash))
            return (false, "Current password is incorrect.");

        var newHash = passwordHashingService.Hash(command.Request.NewPassword);
        await userUpdateRepository.UpdatePasswordAsync(command.UserId, newHash);

        return (true, null);
    }
}

public class ChangePasswordCommand
{
    public ChangePasswordCommand(Guid userId, ChangePasswordRequest request)
    {
        UserId  = userId;
        Request = request;
    }

    public Guid UserId { get; }
    public ChangePasswordRequest Request { get; }
}
