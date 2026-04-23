using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.BugReport;

public interface ICleanupBugReportsCommandHandler
{
    Task HandleAsync();
}

public class CleanupBugReportsCommandHandler(
    IBugReportDeleteRepository bugReportRepository) : ICleanupBugReportsCommandHandler
{
    public async Task HandleAsync()
    {
        await bugReportRepository.CleanupFixedAsync(daysOld: 30);
    }
}
