using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.BugReport;

public interface IMarkBugFixedCommandHandler
{
    Task HandleAsync(Guid id);
}

public class MarkBugFixedCommandHandler(
    IBugReportUpdateRepository bugReportRepository) : IMarkBugFixedCommandHandler
{
    public async Task HandleAsync(Guid id)
    {
        await bugReportRepository.MarkFixedAsync(id);
    }
}
