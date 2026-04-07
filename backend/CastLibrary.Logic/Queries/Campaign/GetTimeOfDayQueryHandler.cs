using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetTimeOfDayQueryHandler
{
    Task<TimeOfDayDomain?> HandleAsync(Guid campaignId);
}

public class GetTimeOfDayQueryHandler(
    ITimeOfDayReadRepository readRepository) : IGetTimeOfDayQueryHandler
{
    public Task<TimeOfDayDomain?> HandleAsync(Guid campaignId) =>
        readRepository.GetByCampaignIdAsync(campaignId);
}
