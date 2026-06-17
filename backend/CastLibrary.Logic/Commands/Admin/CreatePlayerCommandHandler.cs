using CastLibrary.Adapter.Operators;
using CastLibrary.Logic.Commands.Subscription;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Admin;

public interface ICreatePlayerCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(CreatePlayerCommand command);
}

public class CreatePlayerCommandHandler(
    IUserReadRepository userReadRepository,
    IUserInsertRepository userInsertRepository,
    IPasswordHashingService passwordHashingService,
    IEmailConfiguration emailConfiguration,
    IEmailOperator emailOperator,
    ICreateFreeTrialSubscriptionCommandHandler createFreeTrialSubscriptionCommand,
    ISubscriptionWriteRepository subscriptionWriteRepository) : ICreatePlayerCommandHandler
{
    private const string DefaultPassword = "castingcards";

    public async Task<(bool Success, string Error)> HandleAsync(CreatePlayerCommand command)
    {
        if (await userReadRepository.ExistsByEmailAsync(command.Request.Email))
            return (false, "An account with that email address already exists.");

        var verificationToken = Guid.NewGuid().ToString("N");
        var verificationLink = $"{emailConfiguration.FrontendBaseUrl}/verification?token={verificationToken}";

        if (!await emailOperator.SendEmailAsync(new AccountVerificationEmailDomain
        {
            ToEmail = command.Request.Email,
            DisplayName = command.Request.DisplayName,
            VerificationLink = verificationLink
        }))
        {
            return (false, "Failed to send a verification request to that email address.");
        }
        var userId = Guid.NewGuid();
        var user = new UserDomain
        {
            Id = userId,
            Email = command.Request.Email,
            PasswordHash = passwordHashingService.Hash(DefaultPassword),
            DisplayName = command.Request.DisplayName,
            Role = Enum.Parse<UserRole>(command.Request.Role, true),
            CreatedAt = DateTime.UtcNow,
            EmailVerified = false,
            EmailVerificationToken = verificationToken,
        };

        await userInsertRepository.InsertAsync(user);

        if (command.Request.BypassPayment)
        {
            var subscription = new SubscriptionDomain
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = SubscriptionStatus.Active,
                BypassPayment = true,
                LockLevel = LockLevel.FullAccess,
                StripeCustomerId = string.Empty,
                StripeSubscriptionId = string.Empty,
                CreatedAt = DateTime.UtcNow
            };
            await subscriptionWriteRepository.InsertAsync(subscription);
        }
        else
        {
            await createFreeTrialSubscriptionCommand.HandleAsync(
                new CreateFreeTrialSubscriptionCommand(new CreateFreeTrialSubscriptionRequest { UserId = user.Id }));
        }

        return (true, null);
    }
}

public class CreatePlayerCommand
{
    public CreatePlayerCommand(CreatePlayerRequest request)
    {
        Request = request;
    }

    public CreatePlayerRequest Request { get; }
}
