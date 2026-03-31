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
    IAddCityToCampaignCommandHandler addCityCommand,
    IUpdateCityInstanceCommandHandler updateCityInstanceCommand,
    IUpdateCityInstanceVisibilityCommandHandler updateCityInstanceVisibilityCommand,
    IDeleteCityInstanceCommandHandler deleteCityInstanceCommand,
    IDeleteCastInstanceCommandHandler deleteCastInstanceCommand,
    IUpdateCastInstanceCommandHandler updateCastInstanceCommand,
    IUpdateCastCustomItemsCommandHandler updateCastCustomItemsCommand,
    IUpdateLocationCustomItemsCommandHandler updateLocationCustomItemsCommand,
    IAddLocationToCampaignCommandHandler addLocationCommand,
    IDeleteLocationInstanceCommandHandler deleteLocationInstanceCommand,
    IUpdateLocationInstanceVisibilityCommandHandler updateLocationInstanceVisibilityCommand,
    IUpdateCityLocationsVisibilityCommandHandler updateCityLocationsVisibilityCommand,
    IUpdateCastInstanceVisibilityCommandHandler updateCastInstanceVisibilityCommand,
    IUpdateLocationCastsVisibilityCommandHandler updateLocationCastsVisibilityCommand,
    IAddCampaignSecretCommandHandler addSecretCommand,
    IDeleteCampaignSecretCommandHandler deleteCampaignSecretCommand,
    IRevealSecretCommandHandler revealSecretCommand,
    IResealSecretCommandHandler resealSecretCommand,
    IUpdateCityInstanceKeywordsCommandHandler updateCityKeywordsCommand,
    IUpdateCastInstanceKeywordsCommandHandler updateCastKeywordsCommand,
    IUpdateLocationInstanceKeywordsCommandHandler updateLocationKeywordsCommand,
    IGenerateCampaignInviteCodeCommandHandler generateInviteCodeCommand,
    IRedeemCampaignInviteCodeCommandHandler redeemInviteCodeCommand,
    IGetPlayerCampaignLibraryQueryHandler getPlayerLibraryQuery,
    IGetPlayerCampaignDetailQueryHandler getPlayerDetailQuery,
    IRemoveCampaignPlayerCommandHandler removePlayerCommand,
    IUpdateSecretCommandHandler updateSecretCommandHandler,
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
        var (campaign, cities, casts, locations, secrets, relationships, players, inviteCode) = await getDetailQuery.HandleAsync(id);
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
            Cities = cities.Select(o => campaignMapper.ToCityInstanceResponse(o)).ToList(),
            Casts = casts.Select(campaignMapper.ToCastInstanceResponse).ToList(),
            Locations = locations.Select(campaignMapper.ToLocationInstanceResponse).ToList(),
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
        var (campaign, cities, casts, locations, secrets) = await getPlayerDetailQuery.HandleAsync(id);
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
            Cities = cities.Select(o => campaignMapper.ToCityInstanceResponse(o)).ToList(),
            Casts = casts.Select(campaignMapper.ToCastInstanceResponse).ToList(),
            Locations = locations.Select(campaignMapper.ToLocationInstanceResponse).ToList(),
            Secrets = secrets.Select(campaignMapper.ToSecretResponse).ToList(),
        };

        return Ok(response);
    }

    [HttpPost("{id}/cities")]
    public async Task<IActionResult> AddCity(Guid id, [FromBody] AddCityToCampaignRequest request)
    {
        var instance = await addCityCommand.HandleAsync(new AddCityToCampaignCommand(id, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToCityInstanceResponse(instance);
        return Ok(response);
    }

    [HttpPatch("{id}/cities/{instanceId}")]
    public async Task<IActionResult> UpdateCityInstance(Guid id, Guid instanceId,
        [FromBody] UpdateCityInstanceRequest request)
    {
        await updateCityInstanceCommand.HandleAsync(new UpdateCityInstanceCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/cities/{instanceId}/visibility")]
    public async Task<IActionResult> UpdateCityInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateCityInstanceVisibilityRequest request)
    {
        await updateCityInstanceVisibilityCommand.HandleAsync(new UpdateCityInstanceVisibilityCommand(instanceId, request));

        return NoContent();
    }

    [HttpDelete("{id}/cities/{instanceId}")]
    public async Task<IActionResult> DeleteCityInstance(Guid id, Guid instanceId)
    {
        await deleteCityInstanceCommand.HandleAsync(new DeleteCityInstanceCommand(instanceId));

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

    [HttpPatch("{id}/locations/{instanceId}/custom-items")]
    public async Task<IActionResult> UpdateLocationCustomItems(Guid id, Guid instanceId,
        [FromBody] UpdateCastCustomItemsRequest request)
    {
        await updateLocationCustomItemsCommand.HandleAsync(new UpdateLocationCustomItemsCommand(instanceId, request));

        return NoContent();
    }

    [HttpDelete("{id}/casts/{instanceId}")]
    public async Task<IActionResult> DeleteCast(Guid id, Guid instanceId)
    {
        await deleteCastInstanceCommand.HandleAsync(new DeleteCastInstanceCommand(instanceId));

        return NoContent();
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

    [HttpDelete("{id}/locations/{instanceId}")]
    public async Task<IActionResult> DeleteLocation(Guid id, Guid instanceId)
    {
        await deleteLocationInstanceCommand.HandleAsync(new DeleteLocationInstanceCommand(instanceId));

        return NoContent();
    }

    [HttpPatch("{id}/locations/{instanceId}/visibility")]
    public async Task<IActionResult> UpdateLocationInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationInstanceVisibilityRequest request)
    {
        await updateLocationInstanceVisibilityCommand.HandleAsync(new UpdateLocationInstanceVisibilityCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/cities/{instanceId}/locations/visibility")]
    public async Task<IActionResult> UpdateCityLocationsVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateCityLocationsVisibilityRequest request)
    {
        await updateCityLocationsVisibilityCommand.HandleAsync(new UpdateCityLocationsVisibilityCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/casts/{instanceId}/visibility")]
    public async Task<IActionResult> UpdateCastInstanceVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateCastInstanceVisibilityRequest request)
    {
        await updateCastInstanceVisibilityCommand.HandleAsync(new UpdateCastInstanceVisibilityCommand(instanceId, request));

        return NoContent();
    }

    [HttpPatch("{id}/locations/{instanceId}/casts/visibility")]
    public async Task<IActionResult> UpdateLocationCastsVisibility(Guid id, Guid instanceId,
        [FromBody] UpdateLocationCastsVisibilityRequest request)
    {
        await updateLocationCastsVisibilityCommand.HandleAsync(new UpdateLocationCastsVisibilityCommand(instanceId, request));

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
            SecretId = secretId,
            CampaignId = id,
            CastInstanceId = secret.CastInstanceId,
            CityInstanceId = secret.CityInstanceId,
            LocationInstanceId = secret.LocationInstanceId,
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

        var response = campaignMapper.ToSecretResponse(secret);
        return Ok(response);
    }

    [HttpPatch("{id}/cities/{instanceId}/keywords")]
    public async Task<IActionResult> UpdateCityKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        await updateCityKeywordsCommand.HandleAsync(
            new UpdateCityInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

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

    [HttpPatch("{id}/locations/{instanceId}/keywords")]
    public async Task<IActionResult> UpdateLocationKeywords(Guid id, Guid instanceId,
        [FromBody] UpdateInstanceKeywordsRequest request)
    {
        await updateLocationKeywordsCommand.HandleAsync(
            new UpdateLocationInstanceKeywordsCommand(instanceId, userRetriever.GetUserId(User), request));

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
