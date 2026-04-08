using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Validators;
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
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext) : ControllerBase
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
        var (campaign, locations, casts, sublocations, secrets, relationships, players, inviteCode) = await getDetailQuery.HandleAsync(id);
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
        };

        return Ok(response);
    }

    [HttpGet("{id}/player")]
    public async Task<IActionResult> GetPlayerView(Guid id)
    {
        var (campaign, locations, casts, sublocations, secrets) = await getPlayerDetailQuery.HandleAsync(id);
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
        await UpdateLocationInstanceCommand.HandleAsync(new UpdateLocationInstanceCommand(instanceId, request));

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
        await updateCastInstanceCommand.HandleAsync(new UpdateCastInstanceCommand(instanceId, request));

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
        await updateSublocationInstanceCommand.HandleAsync(new UpdateSublocationInstanceCommand(instanceId, request));

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
        var campaign = await redeemInviteCodeCommand.HandleAsync(
            new RedeemCampaignInviteCodeCommand(userRetriever.GetUserId(User), request));
        if (campaign is null)
        {
            return BadRequest(new { message = "That code is invalid or has expired. Ask your DM to generate a new one." });
        }

        var response = campaignMapper.ToListResponse(campaign);
        return Ok(response);
    }

    [HttpDelete("{id}/players/{playerUserId}")]
    public async Task<IActionResult> RemovePlayer(Guid id, Guid playerUserId)
    {
        await removePlayerCommand.HandleAsync(new RemoveCampaignPlayerCommand(id, playerUserId));

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
}




