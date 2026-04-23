using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.BugReport;

public interface ISubmitBugReportCommandHandler
{
    Task<BugReportDomain> HandleAsync(SubmitBugReportCommand command);
}

public class SubmitBugReportCommandHandler(
    IBugReportInsertRepository bugReportRepository) : ISubmitBugReportCommandHandler
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

        return await bugReportRepository.InsertAsync(domain);
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
