using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Auth;

public interface IRegisterUserCommandHandler
{
    Task<(AuthResponse Result, string Error)> HandleAsync(RegisterCommand command);
}
public class RegisterUserCommandHandler(
    IUserReadRepository userReadRepository,
    IUserInsertRepository userInsertRepository,
    IAdminInviteCodeReadRepository adminInviteCodeReadRepository,
    IPasswordHashingService passwordHashingService,
    IJwtTokenService jwtTokenService) : IRegisterUserCommandHandler
{
    public async Task<(AuthResponse Result, string Error)> HandleAsync(RegisterCommand command)
    {
        var activeCode = await adminInviteCodeReadRepository.GetCurrentAsync();
        if (activeCode is null || activeCode.ExpiresAt <= DateTime.UtcNow)
            return (null, "A valid invite code is required to register.");
        if (!string.Equals(activeCode.Code, command.Request.InviteCode.Trim(), StringComparison.OrdinalIgnoreCase))
            return (null, "Invalid invite code.");

        if (await userReadRepository.ExistsByEmailAsync(command.Request.Email))
            return (null, "An account with that email address already exists.");

        var user = new UserDomain
        {
            Id           = Guid.NewGuid(),
            Email        = command.Request.Email,
            PasswordHash = passwordHashingService.Hash(command.Request.Password),
            DisplayName  = command.Request.DisplayName,
            Role         = Enum.Parse<UserRole>(command.Request.Role, true),
            CreatedAt    = DateTime.UtcNow,
        };

        var saved = await userInsertRepository.InsertAsync(user);

        return (new AuthResponse
        {
            Token = jwtTokenService.GenerateToken(saved),
            User  = new UserResponse
            {
                Id          = saved.Id,
                Email       = saved.Email,
                DisplayName = saved.DisplayName,
                Role        = saved.Role.ToString(),
            }
        }, null);
    }
}

public class RegisterCommand
{
    public RegisterCommand(RegisterRequest request)
    {
        Request = request;
    }

    public RegisterRequest Request { get; }
}
