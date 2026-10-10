using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.Location;
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
[Route("api/campaign/{campaignId}/locationinstances")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignLocationsController(
    IGetCampaignLocationInstancesQueryHandler getLocationsQuery,
    IAddLocationToCampaignCommandHandler addLocationCommand,
    IUpdateLocationInstanceCommandHandler updateLocationInstanceCommand,
    IUpdateLocationInstanceVisibilityCommandHandler updateLocationInstanceVisibilityCommand,
    IDeleteLocationInstanceCommandHandler deleteLocationInstanceCommand,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IUploadLocationImageCommandHandler uploadLocationImageCommandHandler,
    IFileValidationService fileValidationService,
    ISignalRNotificationService notifications) : ControllerBase
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
        var response = locations.Select(campaignMapper.ToLocationInstanceResponse).ToList();

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

        var response = campaignMapper.ToLocationInstanceResponse(locations.First());
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

        var response = campaignMapper.ToLocationInstanceResponse(instance);

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

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

        // The card as the campaign now holds it goes out with the event, so a watcher takes the
        // change on from what it is handed rather than reading the card back over the API: read
        // once here, where the write has just landed, instead of once per watching client. The id
        // stays on the payload for watchers that only want to know which card moved.
        var updated = (await getLocationsQuery.HandleAsync(campaignId, instanceId)).FirstOrDefault();

        await notifications.BroadcastLocationInstanceUpdatedAsync(campaignId, new
        {
            campaignId,
            locationInstanceId = instanceId,
            location = updated is null ? null : campaignMapper.ToLocationInstanceResponse(updated),
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

        // Broadcast through the notification service rather than the hub context directly: it is
        // the one place that records every send, which is what the Admin's SignalR inspector reads
        // (see AdminSignalRController). The event the clients receive is unchanged.
        await notifications.BroadcastCardVisibilityChangedAsync(campaignId, new CardVisibilityChangedEvent
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

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

        return NoContent();
    }

    [HttpPost("{id}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid campaignId, Guid id, [FromForm] UploadLocationImageRequest request)
    {
        var validationResult = await fileValidationService.ValidateFileAsync(request.File, 20 * 1024 * 1024,
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);
        var userId = userRetriever.GetUserId(User);
        var (success, _) = await uploadLocationImageCommandHandler.HandleAsync(
            new UploadLocationImageCommand(request.SourceLocationId, userId, request.File.OpenReadStream(), validationResult.DetectedContentType));

        if (!success)
        {
            return NotFound();
        }

        await notifications.BroadcastLocationInstanceUpdatedAsync(campaignId, new
        {
            campaignId = campaignId,
            locationInstanceId = id,
        });

        return Ok();
    }
}