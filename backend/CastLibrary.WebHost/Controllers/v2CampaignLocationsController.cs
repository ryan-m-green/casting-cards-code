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
[Route("api/campaign/{campaignId}/locationinstances")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignLocationsController(
    IGetCampaignLocationInstancesQueryHandler getLocationsQuery,
    IAddLocationToCampaignCommandHandler addLocationCommand,
    IUpdateLocationInstanceCommandHandler updateLocationInstanceCommand,
    IUpdateLocationInstanceVisibilityCommandHandler updateLocationInstanceVisibilityCommand,
    IDeleteLocationInstanceCommandHandler deleteLocationInstanceCommand,
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
    public async Task<IActionResult> GetLocationInstances(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var locations = await getLocationsQuery.HandleAsync(campaignId);
        var response = locations.Select(mapper.ToLocationInstanceResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{locationInstanceId}")]
    public async Task<IActionResult> GetLocationInstance(Guid campaignId, Guid locationInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var locations = await getLocationsQuery.HandleAsync(campaignId, locationInstanceId);
        if (!locations.Any())
        {
            return NotFound();
        }

        var response = mapper.ToLocationInstanceResponse(locations.First());
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddLocation(Guid campaignId, [FromBody] AddLocationToCampaignRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var instance = await addLocationCommand.HandleAsync(new AddLocationToCampaignCommand(campaignId, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = mapper.ToLocationInstanceResponse(instance);

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return Ok(response);
    }

    [HttpPatch("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateLocationInstance(Guid campaignId, Guid instanceId,
        [FromBody] UpdateLocationInstanceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateLocationInstanceCommand.HandleAsync(new UpdateLocationInstanceCommand(instanceId, request, dmUserId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("LocationInstanceUpdated", new
        {
            campaignId          = campaignId,
            locationInstanceId  = instanceId,
        });

        return NoContent();
    }

    [HttpPatch("{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateLocationInstanceVisibility(Guid campaignId, Guid instanceId,
        [FromBody] UpdateLocationInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateLocationInstanceVisibilityCommand.HandleAsync(new UpdateLocationInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = campaignId,
            InstanceId = instanceId,
            CardType   = "location",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpDelete("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteLocationInstance(Guid campaignId, Guid instanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteLocationInstanceCommand.HandleAsync(new DeleteLocationInstanceCommand(instanceId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return NoContent();
    }
}