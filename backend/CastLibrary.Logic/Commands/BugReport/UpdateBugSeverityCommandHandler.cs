using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.BugReport;

public interface IUpdateBugSeverityCommandHandler
{
    Task HandleAsync(Guid id, string severity);
}

public class UpdateBugSeverityCommandHandler(
    IBugReportUpdateRepository bugReportRepository) : IUpdateBugSeverityCommandHandler
{
    public async Task HandleAsync(Guid id, string severity)
    {
        await bugReportRepository.UpdateSeverityAsync(id, severity);
    }
}
