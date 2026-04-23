using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.BugReport;

public interface IGetBugReportsQueryHandler
{
    Task<List<BugReportDomain>> HandleAsync();
}

public class GetBugReportsQueryHandler(
    IBugReportReadRepository bugReportRepository) : IGetBugReportsQueryHandler
{
    public async Task<List<BugReportDomain>> HandleAsync()
    {
        return await bugReportRepository.GetAllAsync();
    }
}
