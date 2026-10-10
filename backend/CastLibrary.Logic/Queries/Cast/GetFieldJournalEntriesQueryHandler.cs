using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Cast;

public interface IGetFieldJournalEntriesQueryHandler
{
    Task<List<PlayerFieldJournalEntryDomain>> HandleAsync(Guid campaignId);
}

public class GetFieldJournalEntriesQueryHandler(
    IPlayerFieldJournalEntryReadRepository readRepository) : IGetFieldJournalEntriesQueryHandler
{
    public Task<List<PlayerFieldJournalEntryDomain>> HandleAsync(Guid campaignId) =>
        readRepository.GetByCampaignAsync(campaignId);
}
