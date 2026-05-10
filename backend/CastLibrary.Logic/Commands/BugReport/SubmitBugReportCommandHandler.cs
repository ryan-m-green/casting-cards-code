using CastLibrary.Adapter.Operators;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using Microsoft.Extensions.Logging;

namespace CastLibrary.Logic.Commands.BugReport;

public interface ISubmitBugReportCommandHandler
{
    Task<BugReportDomain> HandleAsync(SubmitBugReportCommand command);
}

public class SubmitBugReportCommandHandler(
    IBugReportInsertRepository bugReportRepository,
    IEmailOperator emailOperator,
    ILogger<SubmitBugReportCommandHandler> logger) : ISubmitBugReportCommandHandler
{
    public async Task<BugReportDomain> HandleAsync(SubmitBugReportCommand command)
    {
        var domain = new BugReportDomain
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Title = command.Request.Title,
            Description = command.Request.Description,
            StepsToReproduce = command.Request.StepsToReproduce,
            Severity = command.Request.Severity,
            PageUrl = command.Request.PageUrl,
            Device = command.Request.Device,
            Browser = command.Request.Browser,
            Os = command.Request.Os,
            ScreenResolution = command.Request.ScreenResolution,
            IsFixed = false,
            ReportedAt = DateTime.UtcNow,
        };

        var result = await bugReportRepository.InsertAsync(domain);

        try
        {
            await emailOperator.SendBugReportNotificationAsync(new BugReportNotificationEmailDomain
            {
                Title = result.Title,
                Description = result.Description,
                StepsToReproduce = result.StepsToReproduce ?? string.Empty,
                Severity = result.Severity,
                ReporterDisplayName = result.ReporterDisplayName,
                PageUrl = result.PageUrl ?? string.Empty,
                Device = result.Device ?? string.Empty,
                Browser = result.Browser ?? string.Empty,
                Os = result.Os ?? string.Empty,
                ScreenResolution = result.ScreenResolution ?? string.Empty,
                ReportedAt = result.ReportedAt,
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send bug report notification email for bug {BugId}", result.Id);
        }

        return result;
    }
}

public class SubmitBugReportCommand
{
    public SubmitBugReportCommand(Guid userId, SubmitBugReportRequest request)
    {
        UserId = userId;
        Request = request;
    }

    public Guid UserId { get; }
    public SubmitBugReportRequest Request { get; }
}
