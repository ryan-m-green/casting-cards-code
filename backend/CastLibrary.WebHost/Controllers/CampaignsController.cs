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
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignsController(
    IGetCampaignLibraryQueryHandler getLibraryQuery,
    IGetCampaignDetailQueryHandler getDetailQuery,
    ICreateCampaignCommandHandler createCommand,
    IUpdateCampaignCommandHandler updateCampaignCommand,
    IDeleteCampaignCommandHandler deleteCampaignCommand,
    IAddCastToCampaignCommandHandler addCastCommand,
    IAddLocationToCampaignCommandHandler addLocationCommand,
    IUpdateLocationInstanceCommandHandler UpdateLocationInstanceCommand,
    IDeleteLocationInstanceCommandHandler DeleteLocationInstanceCommand,
    IAddSublocationToCampaignCommandHandler addSublocationCommand,
    IAddCampaignSecretCommandHandler addSecretCommand,
    IDeleteCampaignSecretCommandHandler deleteCampaignSecretCommand,
    IUpdateLocationInstanceKeywordsCommandHandler updateLocationKeywordsCommand,
    IGenerateCampaignInviteCodeCommandHandler generateInviteCodeCommand,
    IRedeemCampaignInviteCodeCommandHandler redeemInviteCodeCommand,
    IGetPlayerCampaignLibraryQueryHandler getPlayerLibraryQuery,
    IGetPlayerCampaignDetailQueryHandler getPlayerDetailQuery,
    IRemoveCampaignPlayerCommandHandler removePlayerCommand,
    IUpdateSublocationInstanceCommandHandler updateSublocationInstanceCommand,
    IAddSublocationShopItemCommandHandler addSublocationShopItemCommand,
    IUpdateShopItemCommandHandler updateShopItemCommand,
    IDeleteShopItemCommandHandler deleteShopItemCommand,
    IPurchaseShopItemCommandHandler purchaseShopItemCommand,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext,
    ISignalRNotificationService notifications,
    ICampaignFactionInstanceWebMapper factionMapper,
    IUpdateCampaignLastAccessedCommandHandler updateLastAccessedCommand,
    ICampaignAccessService campaignAccess) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    //Gets all campaign books
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = userRetriever.GetUserId(User);
        var campaigns = userRetriever.IsPlayer(User)
            ? await getPlayerLibraryQuery.HandleAsync(userId)
            : await getLibraryQuery.HandleAsync(userId);
        var response = campaigns.Select(campaignMapper.ToListResponse).ToList();

        return Ok(response);
    }

    // Returns campaigns the caller has joined as a player (works for any role)
    [HttpGet("joined")]
    public async Task<IActionResult> GetJoined()
    {
        var userId = userRetriever.GetUserId(User);
        var campaigns = await getPlayerLibraryQuery.HandleAsync(userId);
        return Ok(campaigns.Select(campaignMapper.ToListResponse).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCampaignRequest request)
    {
        var validator = new CreateCampaignRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        try
        {
            var campaign = await createCommand.HandleAsync(
                new CreateCampaignCommand(userRetriever.GetUserId(User), request, User.IsInRole("Admin")));
            var response = campaignMapper.ToListResponse(campaign);

            return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, response);
        }
        catch (LimitExceededException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCampaignRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var result = await updateCampaignCommand.HandleAsync(
            new UpdateCampaignCommand(id, request, userRetriever.GetUserId(User), User.IsInRole("Admin")));
        if (result is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToListResponse(result);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await CallerOwns(id)) return Forbid();
        await deleteCampaignCommand.HandleAsync(new DeleteCampaignCommand(id));

        return NoContent();
    }

    //TODO: Remove
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await CallerOwns(id)) return Forbid();
        
        // Update LastAccessedAt when campaign is opened
        await updateLastAccessedCommand.HandleAsync(new UpdateCampaignLastAccessedCommand(id));
        
        var (campaign, locations, casts, sublocations, secrets, 
            players, inviteCode, timeOfDay, factions) = await getDetailQuery.HandleAsync(id);
        if (campaign is null)
        {
            return NotFound();
        }

        var response = new CampaignDetailResponse
        {
            Id = campaign.Id,
            DmUserId = campaign.DmUserId,
            Name = campaign.Name,
            FantasyType = campaign.FantasyType,
            Description = campaign.Description,
            SpineColor = campaign.SpineColor,
            WorldMapImageUrl = campaign.WorldMapImageUrl,
            Status = campaign.Status.ToString(),
            IsDemo = campaign.IsDemo,
            Locations = locations.Select(o => campaignMapper.ToLocationInstanceResponse(o)).ToList(),
            Casts = casts.Select(campaignMapper.ToCastInstanceResponse).ToList(),
            Sublocations = sublocations.Select(campaignMapper.ToSublocationInstanceResponse).ToList(),
            Secrets = secrets.Select(campaignMapper.ToSecretResponse).ToList(),
            Players = players.Select(campaignMapper.ToPlayerResponse).ToList(),
            InviteCode = inviteCode is not null ? campaignMapper.ToInviteCodeResponse(inviteCode) : null,
            TimeOfDay = timeOfDay is not null ? campaignMapper.ToTimeOfDayResponse(timeOfDay) : null,
            Factions = factions.Select(factionMapper.ToResponse).ToList(),
        };

        return Ok(response);
    }
    //TODO: Remove
    [HttpGet("{id}/player")]
    public async Task<IActionResult> GetPlayerView(Guid id)
    {
        if (!await CallerCanView(id)) return Forbid();
        var (campaign, locations, casts, sublocations, secrets, timeOfDay, players, factions) = await getPlayerDetailQuery.HandleAsync(id);
        if (campaign is null)
        {
            return NotFound();
        }

        var response = new CampaignDetailResponse
        {
            Id = campaign.Id,
            DmUserId = campaign.DmUserId,
            Name = campaign.Name,
            FantasyType = campaign.FantasyType,
            Description = campaign.Description,
            SpineColor = campaign.SpineColor,
            WorldMapImageUrl = campaign.WorldMapImageUrl,
            Status = campaign.Status.ToString(),
            Locations = locations.Select(campaignMapper.ToLocationInstanceResponse).ToList(),
            Casts = casts.Select(campaignMapper.ToCastInstanceResponse).ToList(),
            Sublocations = sublocations.Select(campaignMapper.ToSublocationInstanceResponse).ToList(),
            Secrets = secrets.Select(campaignMapper.ToSecretResponse).ToList(),
            Players = players.Select(campaignMapper.ToPlayerResponse).ToList(),
            TimeOfDay = timeOfDay is not null ? campaignMapper.ToTimeOfDayResponse(timeOfDay) : null,
            Factions = factions.Select(factionMapper.ToResponse).ToList(),
        };

        return Ok(response);
    }

    [HttpPost("{id}/locations")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddLocation(Guid id, [FromBody] AddLocationToCampaignRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var instance = await addLocationCommand.HandleAsync(new AddLocationToCampaignCommand(id, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToLocationInstanceResponse(instance);

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return Ok(response);
    }

    [HttpPatch("{id}/locations/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateLocationInstance(Guid id, Guid instanceId,
        [FromBody] UpdateLocationInstanceRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await UpdateLocationInstanceCommand.HandleAsync(new UpdateLocationInstanceCommand(instanceId, request, dmUserId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("LocationInstanceUpdated", new
        {
            campaignId          = id,
            locationInstanceId  = instanceId,
        });

        return NoContent();
    }
    //TODO: Remove
    [HttpDelete("{id}/locations/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteLocationInstance(Guid id, Guid instanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await DeleteLocationInstanceCommand.HandleAsync(new DeleteLocationInstanceCommand(instanceId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return NoContent();
    }
    //Investigate: Is this already handled in v2 controller?
    [HttpPost("{id}/casts")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddCast(Guid id, [FromBody] AddCastToCampaignRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var instance = await addCastCommand.HandleAsync(new AddCastToCampaignCommand(id, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToCastInstanceResponse(instance);

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return Ok(response);
    }
    //TODO: Remove
    [HttpPost("{id}/sublocations")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSublocation(Guid id, [FromBody] AddSublocationToCampaignRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var instance = await addSublocationCommand.HandleAsync(new AddSublocationToCampaignCommand(id, request));

        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToSublocationInstanceResponse(instance);

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return Ok(response);
    }
    //TODO: Remove
    [HttpPatch("{id}/sublocations/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationInstance(Guid id, Guid instanceId,
        [FromBody] UpdateSublocationInstanceRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateSublocationInstanceCommand.HandleAsync(new UpdateSublocationInstanceCommand(instanceId, request, dmUserId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("SublocationInstanceUpdated", new
        {
            campaignId              = id,
            sublocationInstanceId   = instanceId,
        });

        return NoContent();
    }
    //TODO: Remove
    [HttpPost("{id}/sublocations/{instanceId}/shop-items")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSublocationShopItem(Guid id, Guid instanceId,
        [FromBody] AddSublocationShopItemRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var item = await addSublocationShopItemCommand.HandleAsync(
            new AddSublocationShopItemCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("ShopItemAdded", new
        {
            campaignId            = id,
            sublocationInstanceId = instanceId,
            shopItem = new
            {
                id              = item.Id,
                name            = item.Name,
                priceAmount     = item.PriceAmount,
                priceCurrencyType = item.PriceCurrencyType,
                description     = item.Description,
                isScratchedOff  = item.IsScratchedOff,
            },
        });

        return Ok(new ShopItemResponse
        {
            Id              = item.Id,
            Name            = item.Name,
            PriceAmount     = item.PriceAmount,
            PriceCurrencyType = item.PriceCurrencyType,
            Description     = item.Description,
            IsScratchedOff  = item.IsScratchedOff,
        });
    }
    //TODO: Remove
    [HttpPatch("{id}/sublocations/{instanceId}/shop-items/{shopItemId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateShopItem(Guid id, Guid instanceId, Guid shopItemId,
        [FromBody] UpdateSublocationShopItemRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateShopItemCommand.HandleAsync(new UpdateShopItemCommand(
            shopItemId, request.Name, request.PriceAmount, request.PriceCurrencyType, request.Description));

        await hubContext.Clients.Group(id.ToString()).SendAsync("ShopItemUpdated", new
        {
            campaignId            = id,
            sublocationInstanceId = instanceId,
            shopItemId,
        });

        return NoContent();
    }

    [HttpDelete("{id}/sublocations/{instanceId}/shop-items/{shopItemId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteShopItem(Guid id, Guid instanceId, Guid shopItemId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await deleteShopItemCommand.HandleAsync(new DeleteShopItemCommand(id, shopItemId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("ShopItemDeleted", new
        {
            campaignId            = id,
            sublocationInstanceId = instanceId,
            shopItemId,
        });

        return NoContent();
    }

    [HttpPost("{id}/sublocations/{instanceId}/shop-items/{shopItemId}/purchase")]
    public async Task<IActionResult> PurchaseShopItem(Guid id, Guid instanceId, Guid shopItemId)
    {
        if (!await CallerCanView(id)) return Forbid();
        var playerUserId = userRetriever.GetUserId(User);
        var result = await purchaseShopItemCommand.HandleAsync(
            new PurchaseShopItemCommand(id, instanceId, shopItemId, playerUserId));

        // Only once the write is persisted: a denial moved nothing, so there is no bag to hand back.
        if (result.Success)
        {
            await notifications.BroadcastInventoryItemPurchasedAsync(id, new
            {
                campaignId = id,
                playerUserId,
                itemName = result.ItemName,
                currencyBalances = result.CurrencyBalances,
            });
        }

        return Ok(result);
    }

    // The secret writes below go through the notification service rather than the hub context
    // directly: it is the one place that records every send, which is what the Admin's SignalR
    // inspector reads — and what lets it pair a send with the receipts the receiving clients report
    // back (see AdminSignalRController and SignalRInspector). The events the clients receive are
    // unchanged.
    [HttpPost("{id}/secrets")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSecret(Guid id, [FromBody] AddCampaignSecretRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var secret = await addSecretCommand.HandleAsync(new AddCampaignSecretCommand(id, request));
        var response = campaignMapper.ToSecretResponse(secret);

        await notifications.BroadcastSecretCreatedAsync(id, new
        {
            secretId = secret.Id,
            campaignId = secret.CampaignId,
            castInstanceId = secret.CastInstanceId,
            locationInstanceId = secret.LocationInstanceId,
            sublocationInstanceId = secret.SublocationInstanceId,
            content = secret.Content,
            sortOrder = secret.SortOrder
        });

        return Ok(response);
    }

    [HttpDelete("{id}/secrets/{secretId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSecret(Guid id, Guid secretId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var deleted = await deleteCampaignSecretCommand.HandleAsync(new DeleteCampaignSecretCommand(secretId, id));
        var status = deleted ? 204 : 404;

        if (deleted) {
            await notifications.BroadcastSecretDeletedAsync(id, new
            {
                secretId = secretId,
                campaignId = id
            });
        }

        return deleted ? NoContent() : NotFound();
    }

    [HttpPatch("{id}/locations/{instanceId}/keywords")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateLocationKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateLocationKeywordsCommand.HandleAsync(
            new UpdateLocationInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

        return NoContent();
    }

    [HttpPost("{id}/invite-code")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GenerateInviteCode(Guid id)
    {
        if (!await CallerOwns(id)) return Forbid();
        var code = await generateInviteCodeCommand.HandleAsync(new GenerateCampaignInviteCodeCommand(id));
        var response = campaignMapper.ToInviteCodeResponse(code);

        return Ok(response);
    }

    [HttpPost("redeem")]
    public async Task<IActionResult> RedeemInviteCode([FromBody] RedeemInviteCodeRequest request)
    {
        var result = await redeemInviteCodeCommand.HandleAsync(
            new RedeemCampaignInviteCodeCommand(userRetriever.GetUserId(User), request));
        if (result is null)
        {
            return BadRequest(new { message = "That code is invalid or has expired. Ask your DM to generate a new one." });
        }

        await hubContext.Clients.Group(result.Campaign.Id.ToString())
            .SendAsync("PlayerJoined", new
            {
                campaignId = result.Campaign.Id,
                player     = campaignMapper.ToPlayerResponse(result.Player),
            });

        var response = campaignMapper.ToListResponse(result.Campaign);
        return Ok(response);
    }

    [HttpDelete("{id}/players/{playerUserId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemovePlayer(Guid id, Guid playerUserId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await removePlayerCommand.HandleAsync(new RemoveCampaignPlayerCommand(id, playerUserId));

        await hubContext.Clients.User(playerUserId.ToString())
            .SendAsync("PlayerRemoved", new { campaignId = id });

        return NoContent();
    }

}







