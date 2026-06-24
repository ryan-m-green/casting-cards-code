using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Admin;

public interface IResetUserPasswordCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(ResetUserPasswordCommand command);
}

public class ResetUserPasswordCommandHandler(
    IUserReadRepository userReadRepository,
    IUserUpdateRepository userUpdateRepository,
    IPasswordHashingService passwordHashingService) : IResetUserPasswordCommandHandler
{
    public async Task<(bool Success, string Error)> HandleAsync(ResetUserPasswordCommand command)
    {
        var adminUser = await userReadRepository.GetByIdAsync(command.AdminUserId);
        if (adminUser is null)
            return (false, "Admin user not found.");

        if (!passwordHashingService.Verify(command.Request.AdminPassword, adminUser.PasswordHash))
            return (false, "Invalid admin password.");

        if (command.AdminUserId == command.TargetUserId)
            return (false, "Cannot reset your own password.");

        var targetUser = await userReadRepository.GetByIdAsync(command.TargetUserId);
        if (targetUser is null)
            return (false, "Target user not found.");

        var newPasswordHash = passwordHashingService.Hash("castingcards");
        await userUpdateRepository.UpdatePasswordAndIncrementTokenVersionAsync(command.TargetUserId, newPasswordHash);
        return (true, null);
    }
}

public class ResetUserPasswordCommand
{
    public ResetUserPasswordCommand(Guid adminUserId, Guid targetUserId, ResetUserPasswordRequest request)
    {
        AdminUserId = adminUserId;
        TargetUserId = targetUserId;
        Request = request;
    }

    public Guid AdminUserId { get; }
    public Guid TargetUserId { get; }
    public ResetUserPasswordRequest Request { get; }
}
