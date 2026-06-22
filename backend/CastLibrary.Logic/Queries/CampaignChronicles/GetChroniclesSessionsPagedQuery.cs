using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.CampaignChronicles;

public interface IGetChroniclesSessionsPagedQueryHandler
{
    Task<ChroniclesResponse> HandleAsync(GetChroniclesSessionsPagedQuery query);
}

public class GetChroniclesSessionsPagedQueryHandler(
    ICampaignChroniclesReadRepository repository,
    IChroniclesFactory factory) : IGetChroniclesSessionsPagedQueryHandler
{
    public async Task<ChroniclesResponse> HandleAsync(GetChroniclesSessionsPagedQuery query)
    {
        var hasSearch = !string.IsNullOrEmpty(query.SearchQuery);
        var hasFilters = query.TypeFilters is { Length: > 0 };

        (IEnumerable<ChroniclesRowEntity> Rows, (int TotalSessions, int TotalChronicles) Counts) result;

        if (hasFilters && hasSearch)
        {
            result = await repository.GetChroniclesSessionsPagedBySearchAndFiltersAsync(
                query.CampaignId,
                query.PageNumber,
                query.PageSize,
                query.SearchQuery,
                query.TypeFilters,
                query.IsPlayer
            );
        }
        else if (hasFilters)
        {
            result = await repository.GetChroniclesSessionsPagedByFiltersAsync(
                query.CampaignId,
                query.PageNumber,
                query.PageSize,
                query.TypeFilters,
                query.IsPlayer
            );
        }
        else if (hasSearch)
        {
            result = await repository.GetChroniclesSessionsPagedBySearchAsync(
                query.CampaignId,
                query.PageNumber,
                query.PageSize,
                query.SearchQuery,
                query.IsPlayer
            );
        }
        else
        {
            result = await repository.GetChroniclesSessionsPagedBySearchAsync(
                query.CampaignId,
                query.PageNumber,
                query.PageSize,
                string.Empty,
                query.IsPlayer
            );
        }

        return factory.CreateFromRawData(
            result.Rows,
            result.Counts,
            query.PageNumber,
            query.PageSize
        );
    }
}

public class GetChroniclesSessionsPagedQuery
{
    public GetChroniclesSessionsPagedQuery(
        Guid campaignId,
        int pageNumber = 1,
        int pageSize = 10,
        string searchQuery = null,
        string[]? typeFilters = null,
        bool isPlayer = false)
    {
        CampaignId = campaignId;
        PageNumber = pageNumber;
        PageSize = pageSize;
        SearchQuery = searchQuery;
        TypeFilters = typeFilters;
        IsPlayer = isPlayer;
    }

    public Guid CampaignId { get; }
    public int PageNumber { get; }
    public int PageSize { get; }
    public string SearchQuery { get; }
    public string[]? TypeFilters { get; }
    public bool IsPlayer { get; }
}
