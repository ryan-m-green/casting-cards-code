using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;using CastLibrary.WebHost.Hubs;
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
    IAssignFactionToCastCommandHandler assignFactionToCastCommand) : ControllerBase
{

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

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCampaignRequest request)
    {
        var validator = new CreateCampaignRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var campaign = await createCommand.HandleAsync(
            new CreateCampaignCommand(userRetriever.GetUserId(User), request));
        var response = campaignMapper.ToListResponse(campaign);

        return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, response);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCampaignRequest request)
    {
        var result = await updateCampaignCommand.HandleAsync(
            new UpdateCampaignCommand(id, request, userRetriever.GetUserId(User)));
        if (result is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToListResponse(result);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await deleteCampaignCommand.HandleAsync(new DeleteCampaignCommand(id));

        return NoContent();
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var (campaign, locations, casts, sublocations, secrets, relationships, players, inviteCode, timeOfDay, factions) = await getDetailQuery.HandleAsync(id);
        if (campaign is null)
        {
            return NotFound();
        }

        var response = new CampaignDetailResponse
        {
            Id = campaign.Id,
            Name = campaign.Name,
            FantasyType = campaign.FantasyType,
            Description = campaign.Description,
            SpineColor = campaign.SpineColor,
            Status = campaign.Status.ToString(),
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
        var (campaign, locations, casts, sublocations, secrets, timeOfDay, factions) = await getPlayerDetailQuery.HandleAsync(id);
        if (campaign is null)
        {
            return NotFound();
        }

        var response = new CampaignDetailResponse
        {
            Id = campaign.Id,
            Name = campaign.Name,
            FantasyType = campaign.FantasyType,
            Description = campaign.Description,
            SpineColor = campaign.SpineColor,
            Status = campaign.Status.ToString(),
            Locations = locations.Select(campaignMapper.ToLocationInstanceResponse).ToList(),
            Casts = casts.Select(campaignMapper.ToCastInstanceResponse).ToList(),
            Sublocations = sublocations.Select(campaignMapper.ToSublocationInstanceResponse).ToList(),
            Secrets = secrets.Select(campaignMapper.ToSecretResponse).ToList(),
            TimeOfDay = timeOfDay is not null ? campaignMapper.ToTimeOfDayResponse(timeOfDay) : null,
            Factions = factions.Select(factionMapper.ToResponse).ToList(),
        };

        return Ok(response);
    }

    [HttpPost("{id}/locations")]
    public async Task<IActionResult> AddLocation(Guid id, [FromBody] AddLocationToCampaignRequest request)
    {
        var instance = await addLocationCommand.HandleAsync(new AddLocationToCampaignCommand(id, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToLocationInstanceResponse(instance);
        return Ok(response);
    }

    [HttpPatch("{id}/locations/{instanceId}")]
    public async Task<IActionResult> UpdateLocationInstance(Guid id, Guid instanceId,
        [FromBody] UpdateLocationInstanceRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        await UpdateLocationInstanceCommand.HandleAsync(new UpdateLocationInstanceCommand(instanceId, request, dmUserId));

        return NoContent();
    }

    [HttpPatch("{id}/locations/{instanceId}/visibility")]
    public async Task<IActionResult> UpdateLocationInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationInstanceVisibilityRequest request)
    {
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
    public async Task<IActionResult> DeleteLocationInstance(Guid id, Guid instanceId)
    {
        await DeleteLocationInstanceCommand.HandleAsync(new DeleteLocationInstanceCommand(instanceId));

        return NoContent();
    }

    [HttpPost("{id}/casts")]
    public async Task<IActionResult> AddCast(Guid id, [FromBody] AddCastToCampaignRequest request)
    {
        var instance = await addCastCommand.HandleAsync(new AddCastToCampaignCommand(id, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToCastInstanceResponse(instance);
        return Ok(response);
    }

    [HttpPatch("{id}/casts/{instanceId}")]
    public async Task<IActionResult> UpdateCast(Guid id, Guid instanceId,
        [FromBody] UpdateCastInstanceRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateCastInstanceCommand.HandleAsync(new UpdateCastInstanceCommand(instanceId, request, dmUserId));

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/custom-items")]
    public async Task<IActionResult> UpdateCastCustomItems(Guid id, Guid instanceId,
        [FromBody] UpdateCastCustomItemsRequest request)
    {
        await updateCastCustomItemsCommand.HandleAsync(new UpdateCastCustomItemsCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/custom-items")]
    public async Task<IActionResult> UpdateSublocationCustomItems(Guid id, Guid instanceId,
        [FromBody] UpdateCastCustomItemsRequest request)
    {
        await updateSublocationCustomItemsCommand.HandleAsync(new UpdateSublocationCustomItemsCommand(instanceId, request));

        return NoContent();
    }

    [HttpDelete("{id}/casts/{instanceId}")]
    public async Task<IActionResult> DeleteCast(Guid id, Guid instanceId)
    {
        await deleteCastInstanceCommand.HandleAsync(new DeleteCastInstanceCommand(instanceId));

        return NoContent();
    }

    [HttpPost("{id}/sublocations")]
    public async Task<IActionResult> AddSublocation(Guid id, [FromBody] AddSublocationToCampaignRequest request)
    {
        var instance = await addSublocationCommand.HandleAsync(new AddSublocationToCampaignCommand(id, request));

        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToSublocationInstanceResponse(instance);
        return Ok(response);
    }

    [HttpPatch("{id}/sublocations/{instanceId}")]
    public async Task<IActionResult> UpdateSublocationInstance(Guid id, Guid instanceId,
        [FromBody] UpdateSublocationInstanceRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateSublocationInstanceCommand.HandleAsync(new UpdateSublocationInstanceCommand(instanceId, request, dmUserId));

        return NoContent();
    }

    [HttpPost("{id}/sublocations/{instanceId}/shop-items")]
    public async Task<IActionResult> AddSublocationShopItem(Guid id, Guid instanceId,
        [FromBody] AddSublocationShopItemRequest request)
    {
        var item = await addSublocationShopItemCommand.HandleAsync(
            new AddSublocationShopItemCommand(instanceId, request));

        return Ok(new ShopItemResponse
        {
            Id            = item.Id,
            Name          = item.Name,
            Price         = item.Price,
            Description   = item.Description,
            IsScratchedOff = item.IsScratchedOff,
        });
    }

    [HttpPatch("{id}/sublocations/{instanceId}/shop-items/{shopItemId}/scratch")]
    public async Task<IActionResult> ToggleShopItemScratch(Guid id, Guid instanceId, Guid shopItemId)
    {
        await toggleShopItemScratchCommand.HandleAsync(new ToggleShopItemScratchCommand(id, shopItemId));

        return NoContent();
    }

    [HttpDelete("{id}/sublocations/{instanceId}")]
    public async Task<IActionResult> DeleteSublocation(Guid id, Guid instanceId)
    {
        await deleteSublocationInstanceCommand.HandleAsync(new DeleteSublocationInstanceCommand(instanceId));

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/visibility")]
    public async Task<IActionResult> UpdateSublocationInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateSublocationInstanceVisibilityRequest request)
    {
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
    public async Task<IActionResult> UpdateLocationSublocationsVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationSublocationsVisibilityRequest request)
    {
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
    public async Task<IActionResult> UpdateCastInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateCastInstanceVisibilityRequest request)
    {
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
    public async Task<IActionResult> UpdateFactionInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateFactionInstanceVisibilityRequest request)
    {
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
    public async Task<IActionResult> UpdateSublocationCastsVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationSublocationsVisibilityRequest request)
    {
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
    public async Task<IActionResult> AddSecret(Guid id, [FromBody] AddCampaignSecretRequest request)
    {
        var secret = await addSecretCommand.HandleAsync(new AddCampaignSecretCommand(id, request));
        var response = campaignMapper.ToSecretResponse(secret);

        return Ok(response);
    }

    [HttpDelete("{id}/secrets/{secretId}")]
    public async Task<IActionResult> DeleteSecret(Guid id, Guid secretId)
    {
        var deleted = await deleteCampaignSecretCommand.HandleAsync(new DeleteCampaignSecretCommand(secretId, id));
        var status = deleted ? 204 : 404;

        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id}/secrets/{secretId}/reveal")]
    public async Task<IActionResult> RevealSecret(Guid id, Guid secretId)
    {
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
    public async Task<IActionResult> ResealSecret(Guid id, Guid secretId)
    {
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
    public async Task<IActionResult> UpdateLocationKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        await updateLocationKeywordsCommand.HandleAsync(
            new UpdateLocationInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/keywords")]
    public async Task<IActionResult> UpdateCastKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        await updateCastKeywordsCommand.HandleAsync(
            new UpdateCastInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

        return NoContent();
    }

    [HttpPatch("{id}/sublocations/{instanceId}/keywords")]
    public async Task<IActionResult> UpdateSublocationKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        await updateSublocationKeywordsCommand.HandleAsync(
            new UpdateSublocationInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

        return NoContent();
    }

    [HttpPost("{id}/invite-code")]
    public async Task<IActionResult> GenerateInviteCode(Guid id)
    {
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
    public async Task<IActionResult> RemovePlayer(Guid id, Guid playerUserId)
    {
        await removePlayerCommand.HandleAsync(new RemoveCampaignPlayerCommand(id, playerUserId));

        await hubContext.Clients.User(playerUserId.ToString())
            .SendAsync("PlayerRemoved", new { campaignId = id });

        return NoContent();
    }

    [HttpPut("{id}/secrets/{secretId}")]
    public async Task<IActionResult> UpdateSecret(Guid id, Guid secretId,
                                                                [FromBody] UpdateSecretRequest request)
    {
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
    public async Task<IActionResult> GetFactions(Guid id)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var instances = await getFactionInstancesQuery.HandleAsync(id, dmUserId);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    [HttpGet("{id}/factions/player")]
    public async Task<IActionResult> GetPlayerFactions(Guid id)
    {
        var instances = await getPlayerFactionInstancesQuery.HandleAsync(id);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    [HttpPost("{id}/factions")]
    public async Task<IActionResult> AddFaction(Guid id, [FromBody] AddFactionToCampaignRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var instance = await addFactionCommand.HandleAsync(new AddFactionToCampaignCommand(id, dmUserId, request));
        if (instance is null) return NotFound();
        return Ok(factionMapper.ToResponse(instance));
    }

    [HttpDelete("{id}/factions/{factionInstanceId}")]
    public async Task<IActionResult> DeleteFaction(Guid id, Guid factionInstanceId)
    {
        await deleteFactionInstanceCommand.HandleAsync(new DeleteFactionInstanceCommand(id, factionInstanceId));

        await hubContext.Clients.Group(id.ToString()).SendAsync("FactionRemoved", new
        {
            campaignId        = id,
            factionInstanceId = factionInstanceId,
        });

        return NoContent();
    }

    [HttpPatch("{id}/factions/{factionInstanceId}")]
    public async Task<IActionResult> UpdateFaction(Guid id, Guid factionInstanceId,
        [FromBody] UpdateFactionInstanceRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateFactionInstanceCommand.HandleAsync(new UpdateFactionInstanceCommand(factionInstanceId, dmUserId, request));
        return NoContent();
    }

    // ── Faction ↔ Sublocation membership ─────────────────────────────────────

    [HttpPost("{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}")]
    public async Task<IActionResult> AddFactionSublocation(Guid id, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        await addFactionSublocationCommand.HandleAsync(factionInstanceId, sublocationInstanceId, dmUserId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}")]
    public async Task<IActionResult> RemoveFactionSublocation(Guid id, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        await removeFactionSublocationCommand.HandleAsync(factionInstanceId, sublocationInstanceId);
        return NoContent();
    }

    [HttpPatch("{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}/primary")]
    public async Task<IActionResult> SetFactionSublocationPrimary(Guid id, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        await setFactionSublocationPrimaryCommand.HandleAsync(factionInstanceId, sublocationInstanceId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/sublocations/primary")]
    public async Task<IActionResult> ClearFactionSublocationPrimary(Guid id, Guid factionInstanceId)
    {
        await clearFactionSublocationPrimaryCommand.HandleAsync(factionInstanceId);
        return NoContent();
    }

    // ── Faction ↔ Cast membership ─────────────────────────────────────────────

    [HttpPost("{id}/factions/{factionInstanceId}/cast/{castInstanceId}")]
    public async Task<IActionResult> AddFactionCastMember(Guid id, Guid factionInstanceId, Guid castInstanceId)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        await addFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId, dmUserId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/cast/{castInstanceId}")]
    public async Task<IActionResult> RemoveFactionCastMember(Guid id, Guid factionInstanceId, Guid castInstanceId)
    {
        await removeFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId);
        return NoContent();
    }

    [HttpPatch("{id}/factions/{factionInstanceId}/cast/{castInstanceId}/primary")]
    public async Task<IActionResult> SetFactionCastMemberPrimary(Guid id, Guid factionInstanceId, Guid castInstanceId)
    {
        await setFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, castInstanceId);
        return NoContent();
    }

    [HttpDelete("{id}/factions/{factionInstanceId}/cast/primary")]
    public async Task<IActionResult> ClearFactionCastMemberPrimary(Guid id, Guid factionInstanceId)
    {
        await clearFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId);
        return NoContent();
    }

    // ── Faction Relationships ─────────────────────────────────────────────────

    [HttpPost("{id}/factions/{factionInstanceId}/relationships")]
    public async Task<IActionResult> AddFactionRelationship(Guid id, Guid factionInstanceId,
        [FromBody] AddFactionRelationshipRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
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
        await removeFactionRelationshipCommand.HandleAsync(relationshipId);
        return NoContent();
    }

    // ── Player: faction symbol assignment ──────────────────────────────────────

    [HttpPatch("{id}/sublocations/{instanceId}/faction-symbol")]
    public async Task<IActionResult> AssignFactionToSublocation(Guid id, Guid instanceId,
        [FromBody] AssignFactionToSublocationRequest request)
    {
        await assignFactionToSublocationCommand.HandleAsync(
            new AssignFactionToSublocationCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/faction-symbols")]
    public async Task<IActionResult> AssignFactionsToCast(Guid id, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(instanceId, request));

        return NoContent();
    }
}




