using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Admin;

public interface IChangeUserRoleCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(ChangeUserRoleCommand command);
}

public class ChangeUserRoleCommandHandler(
    IUserReadRepository userReadRepository,
    IUserUpdateRepository userUpdateRepository,
    IPasswordHashingService passwordHashingService) : IChangeUserRoleCommandHandler
{
    public async Task<(bool Success, string Error)> HandleAsync(ChangeUserRoleCommand command)
    {
        var adminUser = await userReadRepository.GetByIdAsync(command.AdminUserId);
        if (adminUser is null)
            return (false, "Admin user not found.");

        if (!passwordHashingService.Verify(command.Request.AdminPassword, adminUser.PasswordHash))
            return (false, "Invalid admin password.");

        if (command.AdminUserId == command.TargetUserId)
            return (false, "Cannot change your own role.");

        var targetUser = await userReadRepository.GetByIdAsync(command.TargetUserId);
        if (targetUser is null)
            return (false, "Target user not found.");

        if (!Enum.TryParse<UserRole>(command.Request.NewRole, true, out var newRole))
            return (false, "Invalid role specified.");

        if (targetUser.Role == newRole)
            return (false, "User already has this role.");

        await userUpdateRepository.UpdateRoleAndIncrementTokenVersionAsync(command.TargetUserId, newRole.ToString());
        return (true, null);
    }
}

public class ChangeUserRoleCommand
{
    public ChangeUserRoleCommand(Guid adminUserId, Guid targetUserId, ChangeUserRoleRequest request)
    {
        AdminUserId = adminUserId;
        TargetUserId = targetUserId;
        Request = request;
    }

    public Guid AdminUserId { get; }
    public Guid TargetUserId { get; }
    public ChangeUserRoleRequest Request { get; }
}
