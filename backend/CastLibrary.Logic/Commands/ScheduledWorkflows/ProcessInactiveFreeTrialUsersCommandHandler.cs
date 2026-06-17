using System.Collections.Concurrent;
using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using Microsoft.Extensions.Configuration;

namespace CastLibrary.Logic.Commands.ScheduledWorkflows;

public interface IProcessInactiveFreeTrialUsersCommandHandler
{
    Task HandleAsync();
}

public class ProcessInactiveFreeTrialUsersCommandHandler : IProcessInactiveFreeTrialUsersCommandHandler
{
    private readonly IUserReadRepository userReadRepository;
    private readonly IDeleteUserCommandHandler deleteUserCommandHandler;
    private readonly IEmailService emailService;
    private readonly ILoggingService logging;
    public string LoginPageUrl { get; private set; }

    public ProcessInactiveFreeTrialUsersCommandHandler(
        IUserReadRepository userReadRepository,
        IDeleteUserCommandHandler deleteUserCommandHandler,
        IEmailService emailService,
        ILoggingService logging,
        IConfiguration configuration)
    {
        this.userReadRepository = userReadRepository;
        this.deleteUserCommandHandler = deleteUserCommandHandler;
        this.emailService = emailService;
        this.logging = logging;

        var loginUrl = configuration["Email:FrontendBaseUrl"] ?? throw new InvalidOperationException("Email:FrontendBaseUrl not configured");
        LoginPageUrl = $"{loginUrl.TrimEnd('/')}/login";
    }

    public async Task HandleAsync()
    {
        var inactiveUsers = await userReadRepository.GetInactiveFreeTrialUsersAsync();
        var pastDueActionResults = new ConcurrentBag<PastDueActionResults>();

        var over30Days = new ConcurrentBag<InactiveFreeTrialUserDomain>(inactiveUsers.Where(o =>
        {
            var daysInactive = (DateTime.UtcNow.Date - o.LastLoggedInOn.Date).Days;
            return daysInactive >= 30 && daysInactive < 60;
        }));

        var over60Days = new ConcurrentBag<InactiveFreeTrialUserDomain>(inactiveUsers.Where(o =>
        {
            var daysInactive = (DateTime.UtcNow.Date - o.LastLoggedInOn.Date).Days;
            return daysInactive >= 60;
        }));

        var emailTask = HandleOver30DaysAsync(over30Days, pastDueActionResults);
        var deletionTask = HandleOver60DaysAsync(over60Days, pastDueActionResults);

        await Task.WhenAll(emailTask, deletionTask);

        // Log summary
        var emailActions = pastDueActionResults.Where(r => r.ActionType == PastDueActionType.Email && r.IsSuccessfulAction).Count();
        if (emailActions > 0)
        {
            logging.LogInformation($"Sent {emailActions} inactivity reminder emails");
        }

        var successfulDeletedActions = pastDueActionResults.Where(r => r.ActionType == PastDueActionType.Deleted && r.IsSuccessfulAction).ToList();
        var failedDeletedActions = pastDueActionResults.Where(o => o.ActionType == PastDueActionType.Deleted && !o.IsSuccessfulAction).ToList();

        var successSummary = $"Successfully deleted accounts over 60 days {Environment.NewLine}" + string.Join(Environment.NewLine, successfulDeletedActions.Select(o => o.Message));
        var failureSummary = $"Failed To delete accounts over 60 days {Environment.NewLine}" + string.Join(Environment.NewLine, failedDeletedActions.Select(o => o.Message));

        if (successfulDeletedActions.Any())
        {
            logging.LogInformation(successSummary);
        }
        if (failedDeletedActions.Count > 0)
        {
            logging.LogError(failureSummary);
        }
    }

    private async Task HandleOver30DaysAsync(ConcurrentBag<InactiveFreeTrialUserDomain> over30Days, ConcurrentBag<PastDueActionResults> pastDueActionResults)
    {
        foreach (var user in over30Days)
        {
            try
            {
                var emailSent = await emailService.SendInactivityReminderEmailAsync(
                    user.Email,
                    user.DisplayName,
                    LoginPageUrl);

                if (!emailSent)
                {
                    pastDueActionResults.Add(new PastDueActionResults()
                    {
                        ActionType = PastDueActionType.Email,
                        IsSuccessfulAction = false,
                        Message = $"Failed to send inactivity reminder email for {user.DisplayName} with email {user.Email}"
                    });
                }
                else
                {
                    pastDueActionResults.Add(new PastDueActionResults()
                    {
                        ActionType = PastDueActionType.Email,
                        IsSuccessfulAction = true
                    });
                }
            }
            catch (Exception ex)
            {
                pastDueActionResults.Add(new PastDueActionResults()
                {
                    ActionType = PastDueActionType.Email,
                    IsSuccessfulAction = false,
                    Message = $"Failed to send inactivity reminder email for {user.DisplayName} with email {user.Email}. {Environment.NewLine} Error: {ex.Message}"
                });
            }
        }
    }

    private async Task HandleOver60DaysAsync(ConcurrentBag<InactiveFreeTrialUserDomain> over60Days, ConcurrentBag<PastDueActionResults> pastDueActionResults)
    {
        foreach (var user in over60Days)
        {
            try
            {
                await deleteUserCommandHandler.HandleAsync(user.UserId);

                pastDueActionResults.Add(new PastDueActionResults()
                {
                    ActionType = PastDueActionType.Deleted,
                    IsSuccessfulAction = true,
                    Message = $"Deleted userId: {user.UserId}, name: {user.DisplayName}, email: {user.Email}"
                });
            }
            catch (Exception ex)
            {
                pastDueActionResults.Add(new PastDueActionResults()
                {
                    ActionType = PastDueActionType.Deleted,
                    IsSuccessfulAction = false,
                    Message = $"Failed to delete account userId: {user.UserId}, name: {user.DisplayName}, email: {user.Email} for reason:" + ex.Message
                });
            }
        }
    }



    private enum PastDueActionType { Email, Deleted }
    private class PastDueActionResults
    {
        public string Message { get; set; }
        public PastDueActionType ActionType { get; set; }
        public bool IsSuccessfulAction { get; set; }
    }
}
