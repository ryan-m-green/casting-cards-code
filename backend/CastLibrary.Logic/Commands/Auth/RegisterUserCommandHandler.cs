using CastLibrary.Adapter.Operators;
using CastLibrary.Logic.Commands.Subscription;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Auth;

public interface IRegisterUserCommandHandler
{
    Task<(string SuccessMessage, string Error)> HandleAsync(RegisterCommand command);
}

public class RegisterUserCommandHandler(
    IUserReadRepository userReadRepository,
    IUserInsertRepository userInsertRepository,
    IPasswordHashingService passwordHashingService,
    IEmailConfiguration emailConfiguration,
    IEmailOperator emailOperator,
    ICreateFreeTrialSubscriptionCommandHandler createFreeTrialSubscriptionCommand) : IRegisterUserCommandHandler
{
    public async Task<(string SuccessMessage, string Error)> HandleAsync(RegisterCommand command)
    {
        var emailToLower = command.Request.Email.ToLower();
        if (await userReadRepository.ExistsByEmailAsync(emailToLower))
            return (null, "An account with that email address already exists.");

        var verificationToken = Guid.NewGuid().ToString("N");
        var verificationLink = $"{emailConfiguration.FrontendBaseUrl}/verification?token={verificationToken}";

        if (!await emailOperator.SendEmailAsync(new AccountVerificationEmailDomain
        {
            ToEmail = emailToLower,
            DisplayName = command.Request.DisplayName,
            VerificationLink = verificationLink
        }))
        {
            return (null, "Failed to send a verification request to that email address.");
        }

        var user = new UserDomain
        {
            Id = Guid.NewGuid(),
            Email = emailToLower,
            PasswordHash = passwordHashingService.Hash(command.Request.Password),
            DisplayName = command.Request.DisplayName,
            Role = Enum.Parse<UserRole>(command.Request.Role, true),
            CreatedAt = DateTime.UtcNow,
            EmailVerified = false,
            EmailVerificationToken = verificationToken,
        };

        await userInsertRepository.InsertAsync(user);

        await createFreeTrialSubscriptionCommand.HandleAsync(
            new CreateFreeTrialSubscriptionCommand(new CreateFreeTrialSubscriptionRequest { UserId = user.Id }));



        return ("Registration successful. Please check your email for a verification link.", null);
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
