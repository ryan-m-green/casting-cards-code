using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.Campaign;

public interface IGetPlayerInventoryQueryHandler
{
    Task<List<PlayerInventoryItemResponse>> HandleAsync(GetPlayerInventoryQuery query);
}

public class GetPlayerInventoryQueryHandler(
    IPlayerCampaignInventoryReadRepository playerCampaignInventoryReadRepository) : IGetPlayerInventoryQueryHandler
{
    public async Task<List<PlayerInventoryItemResponse>> HandleAsync(GetPlayerInventoryQuery query)
    {
        var inventoryItems = await playerCampaignInventoryReadRepository.GetByCampaignAndPlayerAsync(
            query.CampaignId, query.PlayerUserId);

        return inventoryItems.Select(item => new PlayerInventoryItemResponse
        {
            Id = item.Id,
            Name = item.Name,
            Description = item.Description,
            Count = item.Count
        }).ToList();
    }
}

public class GetPlayerInventoryQuery
{
    public GetPlayerInventoryQuery(Guid campaignId, Guid playerUserId)
    {
        CampaignId = campaignId;
        PlayerUserId = playerUserId;
    }

    public Guid CampaignId { get; }
    public Guid PlayerUserId { get; }
}
