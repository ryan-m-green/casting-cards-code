using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.QuicknoteQueue;

public interface IGetQuicknoteQueueQueryHandler
{
    Task<List<PlayerQuicknoteQueueDomain>> HandleAsync(Guid campaignId, Guid playerUserId);
}

public class GetQuicknoteQueueQueryHandler(
    IQuicknoteQueueReadRepository readRepository) : IGetQuicknoteQueueQueryHandler
{
    public Task<List<PlayerQuicknoteQueueDomain>> HandleAsync(Guid campaignId, Guid playerUserId)
        => readRepository.GetByCampaignPlayerAsync(campaignId, playerUserId);
}
