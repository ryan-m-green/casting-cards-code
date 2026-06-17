using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Auth;

public interface IVerifyEmailCommandHandler
{
    Task<(AuthResponse Result, string Error)> HandleAsync(VerifyEmailCommand command);
}

public class VerifyEmailCommandHandler(
    IUserReadRepository userReadRepository,
    IUserUpdateRepository userUpdateRepository,
    IJwtTokenService jwtTokenService,
    ISubscriptionReadRepository subscriptionReadRepository) : IVerifyEmailCommandHandler
{
    public async Task<(AuthResponse Result, string Error)> HandleAsync(VerifyEmailCommand command)
    {
        var user = await userReadRepository.GetByEmailVerificationTokenAsync(command.Token);
        if (user is null)
            return (null, "Invalid or expired verification token.");

        if (user.EmailVerified)
            return (null, "Email has already been verified.");

        await userUpdateRepository.SetEmailVerifiedAsync(user.Id);

        var verifiedUser = await userReadRepository.GetByIdAsync(user.Id);
        var subscription = await subscriptionReadRepository.GetByUserIdAsync(verifiedUser.Id);
        var bypassPayment = subscription?.BypassPayment ?? false;

        return (new AuthResponse
        {
            Token = jwtTokenService.GenerateToken(verifiedUser, subscription),
            User = new UserResponse
            {
                Id = verifiedUser.Id,
                Email = verifiedUser.Email,
                DisplayName = verifiedUser.DisplayName,
                Role = verifiedUser.Role.ToString(),
            },
            BypassPayment = bypassPayment
        }, null);
    }
}

public class VerifyEmailCommand
{
    public VerifyEmailCommand(string token)
    {
        Token = token;
    }

    public string Token { get; }
}
