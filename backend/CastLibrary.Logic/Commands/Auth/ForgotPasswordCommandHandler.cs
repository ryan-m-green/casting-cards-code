using CastLibrary.Adapter.Operators;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace CastLibrary.Logic.Commands.Auth;

public interface IForgotPasswordCommandHandler
{
    Task HandleAsync(ForgotPasswordCommand command);
}

public class ForgotPasswordCommandHandler(
    IUserReadRepository userReadRepository,
    IPasswordResetTokenInsertRepository tokenInsertRepository,
    IEmailOperator emailOperator,
    IConfiguration configuration,
    ILogger<IForgotPasswordCommandHandler> logger) : IForgotPasswordCommandHandler
{
    public async Task HandleAsync(ForgotPasswordCommand command)
    {
        var user = await userReadRepository.GetByEmailAsync(command.Request.Email);
        if (user is null) return; // Silent — do not reveal whether email exists

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLower();
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLower();

        await tokenInsertRepository.InsertAsync(new PasswordResetTokenDomain
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
        });

        var frontendBaseUrl = configuration["Email:FrontendBaseUrl"]!.TrimEnd('/');
        var resetLink = $"{frontendBaseUrl}/reset-password?token={rawToken}";

        try
        {
            await emailOperator.SendPasswordResetEmailAsync(new PasswordResetEmailDomain
            {
                ToEmail = user.Email,
                DisplayName = user.DisplayName,
                ResetLink = resetLink,
            });
        }
        catch (Exception ex)
        {
            // Log but swallow — never reveal email delivery failure to the caller
            logger.LogError(ex, "Failed to send password reset email to {Email}", user.Email);
        }
    }
}

public class ForgotPasswordCommand
{
    public ForgotPasswordCommand(ForgotPasswordRequest request)
    {
        Request = request;
    }

    public ForgotPasswordRequest Request { get; }
}
