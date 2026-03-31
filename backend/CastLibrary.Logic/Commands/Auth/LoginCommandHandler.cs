using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Auth;

public interface ILoginCommandHandler
{
    Task<AuthResponse> HandleAsync(LoginCommand command);
}
public class LoginCommandHandler(
    IUserReadRepository userReadRepository,
    IPasswordHashingService passwordHashingService,
    IJwtTokenService jwtTokenService) : ILoginCommandHandler
{
    public async Task<AuthResponse> HandleAsync(LoginCommand command)
    {
        var user = await userReadRepository.GetByEmailAsync(command.Request.Email);
        if (user is null) return null;
        if (!passwordHashingService.Verify(command.Request.Password, user.PasswordHash)) return null;

        return new AuthResponse
        {
            Token = jwtTokenService.GenerateToken(user),
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
