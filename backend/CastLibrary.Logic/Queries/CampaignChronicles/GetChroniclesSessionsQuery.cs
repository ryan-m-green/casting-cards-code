using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.CampaignChronicles;

public interface IGetChroniclesSessionsQueryHandler
{
    Task<List<ChroniclesSessionResponse>> HandleAsync(GetChroniclesSessionsQuery query);
}

public class GetChroniclesSessionsQueryHandler(
    ICampaignChroniclesReadRepository repository,
    IChroniclesFactory factory) : IGetChroniclesSessionsQueryHandler
{
    public async Task<List<ChroniclesSessionResponse>> HandleAsync(GetChroniclesSessionsQuery query)
    {
        var rows = await repository.GetSessionsListAsync(query.CampaignId);
        return factory.CreateSessionsListFromRawData(rows);
    }
}

public class GetChroniclesSessionsQuery
{
    public GetChroniclesSessionsQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}
