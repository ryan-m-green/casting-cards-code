using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.BugReport;

public interface IDeleteBugReportCommandHandler
{
    Task HandleAsync(Guid id);
}

public class DeleteBugReportCommandHandler(
    IBugReportDeleteRepository bugReportRepository) : IDeleteBugReportCommandHandler
{
    public async Task HandleAsync(Guid id)
    {
        await bugReportRepository.DeleteAsync(id);
    }
}
