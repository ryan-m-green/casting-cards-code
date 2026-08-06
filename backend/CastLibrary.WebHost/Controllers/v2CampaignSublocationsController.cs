using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Exceptions;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/sublocationinstances")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignSublocationsController(
    IGetCampaignSublocationInstancesQueryHandler getSublocationsQuery,
    IAddSublocationToCampaignCommandHandler addSublocationCommand,
    IUpdateSublocationInstanceCommandHandler updateSublocationInstanceCommand,
    IUpdateSublocationInstanceVisibilityCommandHandler updateSublocationInstanceVisibilityCommand,
    IDeleteSublocationInstanceCommandHandler deleteSublocationInstanceCommand,
    IAddSublocationShopItemCommandHandler addSublocationShopItemCommand,
    IToggleShopItemScratchCommandHandler toggleShopItemScratchCommand,
    IUpdateShopItemCommandHandler updateShopItemCommand,
    IDeleteShopItemCommandHandler deleteShopItemCommand,
    IPurchaseShopItemCommandHandler purchaseShopItemCommand,
    IAssignFactionToSublocationCommandHandler assignFactionToSublocationCommand,
    ICampaignWebMapper mapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetSublocationInstances(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var sublocations = await getSublocationsQuery.HandleAsync(campaignId);
        var response = sublocations.Select(mapper.ToSublocationInstanceResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{sublocationInstanceId}")]
    public async Task<IActionResult> GetSublocationInstance(Guid campaignId, Guid sublocationInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var sublocations = await getSublocationsQuery.HandleAsync(campaignId, sublocationInstanceId);
        if (!sublocations.Any())
        {
            return NotFound();
        }

        var response = mapper.ToSublocationInstanceResponse(sublocations.First());
        return Ok(response);
    }

    [HttpPatch("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationInstance(Guid campaignId, Guid instanceId,
        [FromBody] UpdateSublocationInstanceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateSublocationInstanceCommand.HandleAsync(new UpdateSublocationInstanceCommand(instanceId, request, dmUserId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("SublocationInstanceUpdated", new
        {
            campaignId             = campaignId,
            sublocationInstanceId  = instanceId,
        });

        return NoContent();
    }

    [HttpPatch("{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationInstanceVisibility(Guid campaignId, Guid instanceId,
        [FromBody] UpdateSublocationInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateSublocationInstanceVisibilityCommand.HandleAsync(new UpdateSublocationInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = campaignId,
            InstanceId = instanceId,
            CardType   = "sublocation",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpDelete("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSublocationInstance(Guid campaignId, Guid instanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteSublocationInstanceCommand.HandleAsync(new DeleteSublocationInstanceCommand(instanceId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return NoContent();
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSublocation(Guid campaignId, [FromBody] AddSublocationToCampaignRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var instance = await addSublocationCommand.HandleAsync(new AddSublocationToCampaignCommand(campaignId, request));

        if (instance is null)
        {
            return NotFound();
        }

        var response = mapper.ToSublocationInstanceResponse(instance);

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return Ok(response);
    }

    // ── Shop Items ─────────────────────────────────────────────────────────────

    [HttpPost("{instanceId}/shop-items")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSublocationShopItem(Guid campaignId, Guid instanceId,
        [FromBody] AddSublocationShopItemRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var item = await addSublocationShopItemCommand.HandleAsync(
            new AddSublocationShopItemCommand(instanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("ShopItemAdded", new
        {
            campaignId = campaignId,
            sublocationInstanceId = instanceId,
            shopItem = new
            {
                id = item.Id,
                name = item.Name,
                priceAmount = item.PriceAmount,
                priceCurrencyType = item.PriceCurrencyType,
                description = item.Description,
                isScratchedOff = item.IsScratchedOff,
            },
        });

        return Ok(new ShopItemResponse
        {
            Id = item.Id,
            Name = item.Name,
            PriceAmount = item.PriceAmount,
            PriceCurrencyType = item.PriceCurrencyType,
            Description = item.Description,
            IsScratchedOff = item.IsScratchedOff,
        });
    }

    [HttpPatch("{instanceId}/shop-items/{shopItemId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateShopItem(Guid campaignId, Guid instanceId, Guid shopItemId,
        [FromBody] UpdateSublocationShopItemRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateShopItemCommand.HandleAsync(new UpdateShopItemCommand(
            shopItemId, request.Name, request.PriceAmount, request.PriceCurrencyType, request.Description));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("ShopItemUpdated", new
        {
            campaignId = campaignId,
            sublocationInstanceId = instanceId,
            shopItemId,
        });

        return NoContent();
    }

    [HttpPatch("{instanceId}/shop-items/{shopItemId}/scratch")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> ToggleShopItemScratch(Guid campaignId, Guid instanceId, Guid shopItemId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var isScratchedOff = await toggleShopItemScratchCommand.HandleAsync(new ToggleShopItemScratchCommand(campaignId, shopItemId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("ShopItemScratchToggled", new
        {
            campaignId = campaignId,
            sublocationInstanceId = instanceId,
            shopItemId,
            isScratchedOff,
        });

        return NoContent();
    }

    [HttpDelete("{instanceId}/shop-items/{shopItemId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteShopItem(Guid campaignId, Guid instanceId, Guid shopItemId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteShopItemCommand.HandleAsync(new DeleteShopItemCommand(campaignId, shopItemId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("ShopItemDeleted", new
        {
            campaignId = campaignId,
            sublocationInstanceId = instanceId,
            shopItemId,
        });

        return NoContent();
    }

    [HttpPost("{instanceId}/shop-items/{shopItemId}/purchase")]
    public async Task<IActionResult> PurchaseShopItem(Guid campaignId, Guid instanceId, Guid shopItemId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var playerUserId = userRetriever.GetUserId(User);
        var result = await purchaseShopItemCommand.HandleAsync(
            new PurchaseShopItemCommand(campaignId, instanceId, shopItemId, playerUserId));
        return Ok(result);
    }

    // ── Faction Symbols ────────────────────────────────────────────────────────

    [HttpPatch("{instanceId}/faction-symbol")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignFactionToSublocation(Guid campaignId, Guid instanceId,
        [FromBody] AssignFactionToSublocationRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        request.DmUserId = userRetriever.GetUserId(User);
        await assignFactionToSublocationCommand.HandleAsync(
            new AssignFactionToSublocationCommand(campaignId, instanceId, request));

        return NoContent();
    }

    [HttpPatch("{instanceId}/player-faction-symbol")]
    [Authorize]
    public async Task<IActionResult> AssignPlayerFactionToSublocation(Guid campaignId, Guid instanceId,
        [FromBody] AssignFactionToSublocationRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        request.DmUserId = null;
        await assignFactionToSublocationCommand.HandleAsync(
            new AssignFactionToSublocationCommand(campaignId, instanceId, request));

        var factionInstanceId = request.FactionInstanceId?.ToString() ?? string.Empty;
        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("FactionSymbolAssigned", new
        {
            campaignId = campaignId.ToString(),
            instanceId = instanceId.ToString(),
            entityType = "sublocation",
            factionInstanceIds = string.IsNullOrEmpty(factionInstanceId) ? new List<string>() : new List<string> { factionInstanceId },
            tickCount = DateTime.UtcNow.Ticks
        });

        return NoContent();
    }
}