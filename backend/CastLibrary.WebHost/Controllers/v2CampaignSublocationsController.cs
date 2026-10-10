using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.Sublocation;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Requests;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
    IUploadSublocationImageCommandHandler uploadSublocationImageCommandHandler,
    IFileValidationService fileValidationService,
    ISignalRNotificationService notifications) : ControllerBase
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

        // The card as the campaign now holds it goes out with the event, so a watcher takes the
        // change on from what it is handed rather than reading the card back over the API: read
        // once here, where the write has just landed, instead of once per watching client. The id
        // stays on the payload for watchers that only want to know which card moved.
        var updated = (await getSublocationsQuery.HandleAsync(campaignId, instanceId)).FirstOrDefault();

        await notifications.BroadcastSublocationInstanceUpdatedAsync(campaignId, new
        {
            campaignId,
            sublocationInstanceId = instanceId,
            sublocation = updated is null ? null : mapper.ToSublocationInstanceResponse(updated),
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

        // Broadcast through the notification service rather than the hub context directly: it is
        // the one place that records every send, which is what the Admin's SignalR inspector reads
        // (see AdminSignalRController). The event the clients receive is unchanged.
        await notifications.BroadcastCardVisibilityChangedAsync(campaignId, new CardVisibilityChangedEvent
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

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

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

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

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

        await notifications.BroadcastShopItemAddedAsync(campaignId, new
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

        await notifications.BroadcastShopItemUpdatedAsync(campaignId, new
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

        await notifications.BroadcastShopItemScratchToggledAsync(campaignId, new
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

        await notifications.BroadcastShopItemDeletedAsync(campaignId, new
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

        // Only once the write is persisted: a denial moved nothing, so there is no bag to hand back.
        if (result.Success)
        {
            await notifications.BroadcastInventoryItemPurchasedAsync(campaignId, new
            {
                campaignId,
                playerUserId,
                itemName = result.ItemName,
                currencyBalances = result.CurrencyBalances,
            });
        }

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
        await notifications.BroadcastFactionSymbolAssignedAsync(campaignId, new
        {
            campaignId = campaignId.ToString(),
            instanceId = instanceId.ToString(),
            entityType = "sublocation",
            factionInstanceIds = string.IsNullOrEmpty(factionInstanceId) ? new List<string>() : new List<string> { factionInstanceId },
            tickCount = DateTime.UtcNow.Ticks
        });

        return NoContent();
    }

    [HttpPost("{id}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid campaignId, Guid id, [FromForm] UploadSublocationImageRequest request)
    {
        var validationResult = await fileValidationService.ValidateFileAsync(request.File, 20 * 1024 * 1024,
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);
        var userId = userRetriever.GetUserId(User);
        var (success, _) = await uploadSublocationImageCommandHandler.HandleAsync(
            new UploadSublocationImageCommand(request.SourceSublocationId, userId, request.File.OpenReadStream(), validationResult.DetectedContentType));

        if (!success)
        {
            return NotFound();
        }

        await notifications.BroadcastSublocationInstanceUpdatedAsync(campaignId, new
        {
            campaignId = campaignId,
            sublocationInstanceId = id,
        });

        return Ok();
    }
}