using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Auth;

public interface ILoginCommandHandler
{
    Task<AuthResponse> HandleAsync(LoginCommand command);
}
public class LoginCommandHandler(
    IUserReadRepository userReadRepository,
    IUserWriteRepository userWriteRepository,
    IPasswordHashingService passwordHashingService,
    IJwtTokenService jwtTokenService,
    ISubscriptionReadRepository subscriptionReadRepository) : ILoginCommandHandler
{
    public async Task<AuthResponse> HandleAsync(LoginCommand command)
    {
        var user = await userReadRepository.GetByEmailAsync(command.Request.Email);
        if (user is null) return null;
        if (!passwordHashingService.Verify(command.Request.Password, user.PasswordHash)) return null;
        if (!user.EmailVerified) return null;

        await userWriteRepository.UpdateLastLoggedInOnAsync(user.Id);

        var subscription = await subscriptionReadRepository.GetByUserIdAsync(user.Id);

        return new AuthResponse
        {
            Token = jwtTokenService.GenerateToken(user, subscription),
            User = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Role = user.Role.ToString(),
            }
        };
    }
}

public class LoginCommand
{
    public LoginCommand(LoginRequest request)
    {
        Request = request;
    }

    public LoginRequest Request { get; }
}
