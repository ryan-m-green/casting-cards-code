using CastLibrary.Adapter.Operators;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Auth;

public interface ISendEmailChangeNotificationsCommandHandler
{
    Task HandleAsync(SendEmailChangeNotificationsCommand command);
}

public class SendEmailChangeNotificationsCommandHandler(
    IEmailOperator emailOperator,
    ILoggingService loggingService) : ISendEmailChangeNotificationsCommandHandler
{
    public async Task HandleAsync(SendEmailChangeNotificationsCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.OldEmail) ||
            string.IsNullOrWhiteSpace(command.NewEmail) ||
            string.IsNullOrWhiteSpace(command.DisplayName))
        {
            loggingService.LogError("Email change notification failed: Invalid email addresses or display name");
            return;
        }

        var securityAlertTask = emailOperator.SendEmailAsync(new EmailChangeSecurityAlertEmailDomain
        {
            ToEmail = command.OldEmail,
            DisplayName = command.DisplayName,
            NewEmail = command.NewEmail,
            ChangedAt = command.ChangedAt
        });

        var confirmationTask = emailOperator.SendEmailAsync(new EmailChangeConfirmationEmailDomain
        {
            ToEmail = command.NewEmail,
            DisplayName = command.DisplayName,
            ChangedAt = command.ChangedAt
        });

        await Task.WhenAll(securityAlertTask, confirmationTask);

        var securityAlertSent = await securityAlertTask;
        var confirmationSent = await confirmationTask;

        if (!securityAlertSent)
        {
            loggingService.LogError($"Failed to send security alert email to {command.OldEmail}");
        }

        if (!confirmationSent)
        {
            loggingService.LogError($"Failed to send confirmation email to {command.NewEmail}");
        }
    }
}

public class SendEmailChangeNotificationsCommand
{
    public string OldEmail { get; set; } = string.Empty;
    public string NewEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ChangedAt { get; set; } = string.Empty;
}
