using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.CampaignChronicles;

public interface IGetChronicleFeedQueryHandler
{
    Task<List<CampaignChronicleFeedItemResponse>> HandleAsync(GetChronicleFeedQuery query);
}

/// <summary>
/// Reads the v2 standalone chronicle feed for a campaign. The controller never talks to
/// the repository itself - this handler owns the data access and the response mapping.
/// </summary>
public class GetChronicleFeedQueryHandler(
    ICampaignChroniclesFeedReadRepository repository,
    ICampaignChronicleFeedFactory factory) : IGetChronicleFeedQueryHandler
{
    public async Task<List<CampaignChronicleFeedItemResponse>> HandleAsync(GetChronicleFeedQuery query)
    {
        var entries = await repository.GetByCampaignIdAsync(
            query.CampaignId,
            query.IncludeGmOnly,
            query.ContentTypes,
            query.Limit);

        return factory.CreateFromRawData(entries);
    }
}

public class GetChronicleFeedQuery
{
    public GetChronicleFeedQuery(
        Guid campaignId,
        bool includeGmOnly,
        string[]? contentTypes = null,
        int limit = 200)
    {
        CampaignId = campaignId;
        IncludeGmOnly = includeGmOnly;
        ContentTypes = contentTypes;
        Limit = limit;
    }

    public Guid CampaignId { get; }
    public bool IncludeGmOnly { get; }
    public string[]? ContentTypes { get; }
    public int Limit { get; }
}
