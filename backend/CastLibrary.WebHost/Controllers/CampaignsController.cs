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
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns")]
[Authorize]
public class CampaignsController(
    IGetCampaignLibraryQueryHandler getLibraryQuery,
    IGetCampaignDetailQueryHandler getDetailQuery,
    ICreateCampaignCommandHandler createCommand,
    IUpdateCampaignCommandHandler updateCampaignCommand,
    IDeleteCampaignCommandHandler deleteCampaignCommand,
    IAddCastToCampaignCommandHandler addCastCommand,
    IAddLocationToCampaignCommandHandler addLocationCommand,
    IUpdateLocationInstanceCommandHandler UpdateLocationInstanceCommand,
    IUpdateLocationInstanceVisibilityCommandHandler UpdateLocationInstanceVisibilityCommand,
    IDeleteLocationInstanceCommandHandler DeleteLocationInstanceCommand,
    IDeleteCastInstanceCommandHandler deleteCastInstanceCommand,
    IUpdateCastInstanceCommandHandler updateCastInstanceCommand,
    IUpdateCastCustomItemsCommandHandler updateCastCustomItemsCommand,
    IUpdateSublocationCustomItemsCommandHandler updateSublocationCustomItemsCommand,
    IAddSublocationToCampaignCommandHandler addSublocationCommand,
    IDeleteSublocationInstanceCommandHandler deleteSublocationInstanceCommand,
    IUpdateSublocationInstanceVisibilityCommandHandler updateSublocationInstanceVisibilityCommand,
    IUpdateLocationSublocationsVisibilityCommandHandler UpdateLocationSublocationsVisibilityCommand,
    IUpdateCastInstanceVisibilityCommandHandler updateCastInstanceVisibilityCommand,
    IUpdateSublocationCastsVisibilityCommandHandler updateSublocationCastsVisibilityCommand,
    IAddCampaignSecretCommandHandler addSecretCommand,
    IDeleteCampaignSecretCommandHandler deleteCampaignSecretCommand,
    IRevealSecretCommandHandler revealSecretCommand,
    IResealSecretCommandHandler resealSecretCommand,
    IUpdateLocationInstanceKeywordsCommandHandler updateLocationKeywordsCommand,
    IUpdateCastInstanceKeywordsCommandHandler updateCastKeywordsCommand,
    IUpdateSublocationInstanceKeywordsCommandHandler updateSublocationKeywordsCommand,
    IGenerateCampaignInviteCodeCommandHandler generateInviteCodeCommand,
    IRedeemCampaignInviteCodeCommandHandler redeemInviteCodeCommand,
    IGetPlayerCampaignLibraryQueryHandler getPlayerLibraryQuery,
    IGetPlayerCampaignDetailQueryHandler getPlayerDetailQuery,
    IRemoveCampaignPlayerCommandHandler removePlayerCommand,
    IUpdateSecretCommandHandler updateSecretCommandHandler,
    IUpdateSublocationInstanceCommandHandler updateSublocationInstanceCommand,
    IAddSublocationShopItemCommandHandler addSublocationShopItemCommand,
    IToggleShopItemScratchCommandHandler toggleShopItemScratchCommand,
    IUpdateShopItemCommandHandler updateShopItemCommand,
    IPurchaseShopItemCommandHandler purchaseShopItemCommand,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext,
    IAddFactionToCampaignCommandHandler addFactionCommand,
    IDeleteFactionInstanceCommandHandler deleteFactionInstanceCommand,
    IUpdateFactionInstanceCommandHandler updateFactionInstanceCommand,
    IGetCampaignFactionInstancesQueryHandler getFactionInstancesQuery,
    ICampaignFactionInstanceWebMapper factionMapper,
    IAddFactionSublocationCommandHandler addFactionSublocationCommand,
    IRemoveFactionSublocationCommandHandler removeFactionSublocationCommand,
    ISetFactionSublocationPrimaryCommandHandler setFactionSublocationPrimaryCommand,
    IClearFactionSublocationPrimaryCommandHandler clearFactionSublocationPrimaryCommand,
    IAddFactionCastMemberCommandHandler addFactionCastMemberCommand,
    IRemoveFactionCastMemberCommandHandler removeFactionCastMemberCommand,
    ISetFactionCastMemberPrimaryCommandHandler setFactionCastMemberPrimaryCommand,
    IClearFactionCastMemberPrimaryCommandHandler clearFactionCastMemberPrimaryCommand,
    IAddFactionRelationshipCommandHandler addFactionRelationshipCommand,
    IRemoveFactionRelationshipCommandHandler removeFactionRelationshipCommand,
    IUpdateFactionInstanceVisibilityCommandHandler updateFactionInstanceVisibilityCommand,
    IGetPlayerCampaignFactionInstancesQueryHandler getPlayerFactionInstancesQuery,
    IAssignFactionToSublocationCommandHandler assignFactionToSublocationCommand,
    IAssignFactionToCastCommandHandler assignFactionToCastCommand,
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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await CallerOwns(id)) return Forbid();
        var (campaign, locations, casts, sublocations, secrets, relationships, 
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
            Status = campaign.Status.ToString(),
            IsDemo = campaign.IsDemo,
            Locations = locations.Select(o => campaignMapper.ToLocationInstanceResponse(o)).ToList(),
            Casts = casts.Select(campaignMapper.ToCastInstanceResponse).ToList(),
            Sublocations = sublocations.Select(campaignMapper.ToSublocationInstanceResponse).ToList(),
            Secrets = secrets.Select(campaignMapper.ToSecretResponse).ToList(),
            Relationships = relationships.Select(campaignMapper.ToRelationshipResponse).ToList(),
            Players = players.Select(campaignMapper.ToPlayerResponse).ToList(),
            InviteCode = inviteCode is not null ? campaignMapper.ToInviteCodeResponse(inviteCode) : null,
            TimeOfDay = timeOfDay is not null ? campaignMapper.ToTimeOfDayResponse(timeOfDay) : null,
            Factions = factions.Select(factionMapper.ToResponse).ToList(),
        };

        return Ok(response);
    }

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

    [HttpPatch("{id}/locations/{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateLocationInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await UpdateLocationInstanceVisibilityCommand.HandleAsync(new UpdateLocationInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = id,
            InstanceId = instanceId,
            CardType   = "location",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpDelete("{id}/locations/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteLocationInstance(Guid id, Guid instanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await DeleteLocationInstanceCommand.HandleAsync(new DeleteLocationInstanceCommand(instanceId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return NoContent();
    }

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

    [HttpPatch("{id}/casts/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCast(Guid id, Guid instanceId,
        [FromBody] UpdateCastInstanceRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateCastInstanceCommand.HandleAsync(new UpdateCastInstanceCommand(instanceId, request, dmUserId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CastInstanceUpdated", new
        {
            campaignId     = id,
            castInstanceId = instanceId,
        });

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/custom-items")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCastCustomItems(Guid id, Guid instanceId,
        [FromBody] UpdateCastCustomItemsRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateCastCustomItemsCommand.HandleAsync(new UpdateCastCustomItemsCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/custom-items")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationCustomItems(Guid id, Guid instanceId,
        [FromBody] UpdateCastCustomItemsRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateSublocationCustomItemsCommand.HandleAsync(new UpdateSublocationCustomItemsCommand(instanceId, request));

        return NoContent();
    }

    [HttpDelete("{id}/casts/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteCast(Guid id, Guid instanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await deleteCastInstanceCommand.HandleAsync(new DeleteCastInstanceCommand(instanceId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return NoContent();
    }

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

    [HttpPost("{id}/sublocations/{instanceId}/shop-items")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSublocationShopItem(Guid id, Guid instanceId,
        [FromBody] AddSublocationShopItemRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var item = await addSublocationShopItemCommand.HandleAsync(
            new AddSublocationShopItemCommand(instanceId, request));

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

    [HttpPatch("{id}/sublocations/{instanceId}/shop-items/{shopItemId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateShopItem(Guid id, Guid instanceId, Guid shopItemId,
        [FromBody] UpdateSublocationShopItemRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateShopItemCommand.HandleAsync(new UpdateShopItemCommand(
            shopItemId, request.Name, request.PriceAmount, request.PriceCurrencyType));

        await hubContext.Clients.Group(id.ToString()).SendAsync("ShopItemUpdated", new
        {
            campaignId            = id,
            sublocationInstanceId = instanceId,
            shopItemId,
        });

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/shop-items/{shopItemId}/scratch")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> ToggleShopItemScratch(Guid id, Guid instanceId, Guid shopItemId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var isScratchedOff = await toggleShopItemScratchCommand.HandleAsync(new ToggleShopItemScratchCommand(id, shopItemId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("ShopItemScratchToggled", new
        {
            campaignId            = id,
            sublocationInstanceId = instanceId,
            shopItemId,
            isScratchedOff,
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
        return Ok(result);
    }

    [HttpDelete("{id}/sublocations/{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSublocation(Guid id, Guid instanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await deleteSublocationInstanceCommand.HandleAsync(new DeleteSublocationInstanceCommand(instanceId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateSublocationInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateSublocationInstanceVisibilityCommand.HandleAsync(new UpdateSublocationInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = id,
            InstanceId = instanceId,
            CardType   = "sublocation",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpPatch("{id}/locations/{instanceId}/sublocations/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateLocationSublocationsVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationSublocationsVisibilityRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await UpdateLocationSublocationsVisibilityCommand.HandleAsync(new UpdateLocationSublocationsVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("BulkCardVisibilityChanged", new BulkCardVisibilityChangedEvent
        {
            CampaignId       = id,
            ParentInstanceId = instanceId,
            CardType         = "sublocation",
            IsVisible        = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCastInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateCastInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateCastInstanceVisibilityCommand.HandleAsync(new UpdateCastInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = id,
            InstanceId = instanceId,
            CardType   = "cast",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpPatch("{id}/factions/{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateFactionInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateFactionInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateFactionInstanceVisibilityCommand.HandleAsync(new UpdateFactionInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = id,
            InstanceId = instanceId,
            CardType   = "faction",
            IsVisible  = request.IsVisibleToPlayers,
        });

        if (!request.IsVisibleToPlayers)
        {
            await hubContext.Clients.Group(id.ToString()).SendAsync("FactionLocked", new
            {
                campaignId        = id,
                factionInstanceId = instanceId,
            });
        }

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/casts/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationCastsVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationSublocationsVisibilityRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateSublocationCastsVisibilityCommand.HandleAsync(new UpdateSublocationCastsVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("BulkCardVisibilityChanged", new BulkCardVisibilityChangedEvent
        {
            CampaignId       = id,
            ParentInstanceId = instanceId,
            CardType         = "cast",
            IsVisible        = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpPost("{id}/secrets")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSecret(Guid id, [FromBody] AddCampaignSecretRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var secret = await addSecretCommand.HandleAsync(new AddCampaignSecretCommand(id, request));
        var response = campaignMapper.ToSecretResponse(secret);

        return Ok(response);
    }

    [HttpDelete("{id}/secrets/{secretId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSecret(Guid id, Guid secretId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var deleted = await deleteCampaignSecretCommand.HandleAsync(new DeleteCampaignSecretCommand(secretId, id));
        var status = deleted ? 204 : 404;

        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id}/secrets/{secretId}/reveal")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RevealSecret(Guid id, Guid secretId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var secret = await revealSecretCommand.HandleAsync(new RevealSecretCommand(secretId, id));
        if (secret is null)
        {
            return NotFound();
        }

        await hubContext.Clients.Group(id.ToString()).SendAsync("SecretRevealed", new SecretRevealedEvent
        {
            SecretId           = secretId,
            CampaignId         = id,
            CastInstanceId        = secret.CastInstanceId,
            LocationInstanceId        = secret.LocationInstanceId,
            SublocationInstanceId = secret.SublocationInstanceId,
            SecretContent         = secret.Content,
        });

        var response = campaignMapper.ToSecretResponse(secret);
        return Ok(response);
    }

    [HttpPatch("{id}/secrets/{secretId}/reseal")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> ResealSecret(Guid id, Guid secretId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var secret = await resealSecretCommand.HandleAsync(new ResealSecretCommand(secretId, id));
        if (secret is null)
        {
            return NotFound();
        }

        await hubContext.Clients.Group(id.ToString()).SendAsync("SecretResealed", new SecretResealedEvent
        {
            SecretId           = secretId,
            CampaignId         = id,
            CastInstanceId        = secret.CastInstanceId,
            LocationInstanceId        = secret.LocationInstanceId,
            SublocationInstanceId = secret.SublocationInstanceId,
        });

        var response = campaignMapper.ToSecretResponse(secret);
        return Ok(response);
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

    [HttpPatch("{id}/casts/{instanceId}/keywords")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCastKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateCastKeywordsCommand.HandleAsync(
            new UpdateCastInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/keywords")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSublocationKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        await updateSublocationKeywordsCommand.HandleAsync(
            new UpdateSublocationInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

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

    [HttpPut("{id}/secrets/{secretId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSecret(Guid id, Guid secretId,
                                                                [FromBody] UpdateSecretRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var secret = await updateSecretCommandHandler
            .HandleAsync(new UpdateSecretCommand(id, secretId, request));

        if (secret is null || secret.CampaignId != id)
        {
            return NotFound();
        }

        var response = campaignMapper.ToSecretResponse(secret);
        return Ok(response);
    }

    // ── Factions ──────────────────────────────────────────────────────────────

    [HttpGet("{id}/factions")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetFactions(Guid id)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        var instances = await getFactionInstancesQuery.HandleAsync(id, dmUserId);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    [HttpGet("{id}/factions/player")]
    public async Task<IActionResult> GetPlayerFactions(Guid id)
    {
        if (!await CallerCanView(id)) return Forbid();
        var instances = await getPlayerFactionInstancesQuery.HandleAsync(id);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    [HttpPost("{id}/factions")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFaction(Guid id, [FromBody] AddFactionToCampaignRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        var instance = await addFactionCommand.HandleAsync(new AddFactionToCampaignCommand(id, dmUserId, request));
        if (instance is null) return NotFound();

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return Ok(factionMapper.ToResponse(instance));
    }

    [HttpDelete("{id}/factions/{factionInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteFaction(Guid id, Guid factionInstanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await deleteFactionInstanceCommand.HandleAsync(new DeleteFactionInstanceCommand(id, factionInstanceId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("FactionRemoved", new
        {
            campaignId        = id,
            factionInstanceId = factionInstanceId,
        });

        await hubContext.Clients.Group(id.ToString()).SendAsync("CampaignNavChanged", new { campaignId = id });

        return NoContent();
    }

    [HttpPatch("{id}/factions/{factionInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateFaction(Guid id, Guid factionInstanceId,
        [FromBody] UpdateFactionInstanceRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateFactionInstanceCommand.HandleAsync(new UpdateFactionInstanceCommand(factionInstanceId, dmUserId, request));

        await hubContext.Clients.Group(id.ToString()).SendAsync("FactionInstanceUpdated", new
        {
            campaignId          = id,
            factionInstanceId,
        });

        return NoContent();
    }

    // ── Faction ↔ Sublocation membership ─────────────────────────────────────

    [HttpPost("{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFactionSublocation(Guid id, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await addFactionSublocationCommand.HandleAsync(factionInstanceId, sublocationInstanceId, dmUserId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveFactionSublocation(Guid id, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await removeFactionSublocationCommand.HandleAsync(factionInstanceId, sublocationInstanceId);
        return NoContent();
    }

    [HttpPatch("{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}/primary")]
    public async Task<IActionResult> SetFactionSublocationPrimary(Guid id, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        if (!await CallerCanView(id)) return Forbid();
        await setFactionSublocationPrimaryCommand.HandleAsync(factionInstanceId, sublocationInstanceId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/sublocations/primary")]
    public async Task<IActionResult> ClearFactionSublocationPrimary(Guid id, Guid factionInstanceId)
    {
        if (!await CallerCanView(id)) return Forbid();
        await clearFactionSublocationPrimaryCommand.HandleAsync(factionInstanceId);
        return NoContent();
    }

    // ── Faction ↔ Cast membership ─────────────────────────────────────────────

    [HttpPost("{id}/factions/{factionInstanceId}/cast/{castInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFactionCastMember(Guid id, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await addFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId, dmUserId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/cast/{castInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveFactionCastMember(Guid id, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerOwns(id)) return Forbid();
        await removeFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId);
        return NoContent();
    }

    [HttpPatch("{id}/factions/{factionInstanceId}/cast/{castInstanceId}/primary")]
    public async Task<IActionResult> SetFactionCastMemberPrimary(Guid id, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerCanView(id)) return Forbid();
        await setFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, castInstanceId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/cast/primary")]
    public async Task<IActionResult> ClearFactionCastMemberPrimary(Guid id, Guid factionInstanceId)
    {
        if (!await CallerCanView(id)) return Forbid();
        await clearFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId);
        return NoContent();
    }

    // ── Faction Relationships ─────────────────────────────────────────────────

    [HttpPost("{id}/factions/{factionInstanceId}/relationships")]
    public async Task<IActionResult> AddFactionRelationship(Guid id, Guid factionInstanceId,
        [FromBody] AddFactionRelationshipRequest request)
    {
        if (!await CallerCanView(id)) return Forbid();
        var dmUserId = userRetriever.IsPlayer(User) ? (Guid?)null : userRetriever.GetDmUserId(User);
        var relationship = await addFactionRelationshipCommand.HandleAsync(
            new AddFactionRelationshipCommand(id, dmUserId, request));
        return Ok(new CampaignFactionRelationshipResponse
        {
            Id                 = relationship.Id,
            CampaignId         = relationship.CampaignId,
            FactionInstanceIdA = relationship.FactionInstanceIdA,
            FactionInstanceIdB = relationship.FactionInstanceIdB,
            RelationshipType   = relationship.RelationshipType,
            Strength           = relationship.Strength,
            CreatedAt          = relationship.CreatedAt,
            DmUserId           = relationship.DmUserId,
        });
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/relationships/{relationshipId}")]
    public async Task<IActionResult> RemoveFactionRelationship(Guid id, Guid factionInstanceId, Guid relationshipId)
    {
        if (!await CallerCanView(id)) return Forbid();
        await removeFactionRelationshipCommand.HandleAsync(relationshipId);
        return NoContent();
    }

    // ── DM: faction symbol assignment ──────────────────────────────────────────

    [HttpPatch("{id}/sublocations/{instanceId}/faction-symbol")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignFactionToSublocation(Guid id, Guid instanceId,
        [FromBody] AssignFactionToSublocationRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        request.DmUserId = userRetriever.GetUserId(User);
        await assignFactionToSublocationCommand.HandleAsync(
            new AssignFactionToSublocationCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/faction-symbols")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignFactionsToCast(Guid id, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        if (!await CallerOwns(id)) return Forbid();
        request.DmUserId = userRetriever.GetUserId(User);
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(instanceId, request));

        return NoContent();
    }

    // ── Player: faction symbol assignment ──────────────────────────────────────

    [HttpPatch("{id}/sublocations/{instanceId}/player-faction-symbol")]
    [Authorize]
    public async Task<IActionResult> AssignPlayerFactionToSublocation(Guid id, Guid instanceId,
        [FromBody] AssignFactionToSublocationRequest request)
    {
        if (!await CallerCanView(id)) return Forbid();
        request.DmUserId = null;
        await assignFactionToSublocationCommand.HandleAsync(
            new AssignFactionToSublocationCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/player-faction-symbols")]
    [Authorize]
    public async Task<IActionResult> AssignPlayerFactionsToCast(Guid id, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        if (!await CallerCanView(id)) return Forbid();
        request.DmUserId = null;
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(instanceId, request));

        return NoContent();
    }
}




