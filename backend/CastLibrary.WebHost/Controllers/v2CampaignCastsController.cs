using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.Cast;
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
[Route("api/campaign/{campaignId}/castinstances")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignCastsController(
    IGetCampaignCastInstancesQueryHandler getCastsQuery,
    IAddCastToCampaignCommandHandler addCastCommand,
    IUpdateCastInstanceCommandHandler updateCastInstanceCommand,
    IUpdateCastInstanceStarsCommandHandler updateCastInstanceStarsCommand,
    IDeleteCastInstanceCommandHandler deleteCastInstanceCommand,
    IUpdateCastInstanceVisibilityCommandHandler updateCastInstanceVisibilityCommand,
    IAssignFactionToCastCommandHandler assignFactionToCastCommand,
    ICampaignWebMapper mapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IUploadCastImageCommandHandler uploadCastImageCommandHandler,
    IFileValidationService fileValidationService,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetCastInstances(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var casts = await getCastsQuery.HandleAsync(campaignId);
        var response = casts.Select(mapper.ToCastInstanceResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{castInstanceId}")]
    public async Task<IActionResult> GetCastInstance(Guid campaignId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var casts = await getCastsQuery.HandleAsync(campaignId, castInstanceId);
        if (!casts.Any())
        {
            return NotFound();
        }

        var response = mapper.ToCastInstanceResponse(casts.First());
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddCast(Guid campaignId, [FromBody] AddCastToCampaignRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var instance = await addCastCommand.HandleAsync(new AddCastToCampaignCommand(campaignId, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = mapper.ToCastInstanceResponse(instance);

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

        return Ok(response);
    }

    [HttpPatch("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCast(Guid campaignId, Guid instanceId,
        [FromBody] UpdateCastInstanceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateCastInstanceCommand.HandleAsync(new UpdateCastInstanceCommand(instanceId, request, dmUserId));

        // The card as the campaign now holds it goes out with the event, so a watcher takes the
        // change on from what it is handed rather than reading the card back over the API: read
        // once here, where the write has just landed, instead of once per watching client. The id
        // stays on the payload for watchers that only want to know which card moved.
        var updated = (await getCastsQuery.HandleAsync(campaignId, instanceId)).FirstOrDefault();

        await notifications.BroadcastCastInstanceUpdatedAsync(campaignId, new
        {
            campaignId,
            castInstanceId = instanceId,
            cast = updated is null ? null : mapper.ToCastInstanceResponse(updated),
        });

        return NoContent();
    }

    /// <summary>
    /// The stars a cast card wears: the party's own rating of its importance, 1 to 3. Any member of
    /// the campaign sets them — players rate the cards they meet — so this route asks only that the
    /// caller may view the campaign (see UpdateCastInstanceStarsCommandHandler).
    /// </summary>
    [HttpPatch("{instanceId}/stars")]
    [Authorize]
    public async Task<IActionResult> UpdateCastInstanceStars(Guid campaignId, Guid instanceId,
        [FromBody] UpdateCastInstanceStarsRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        request.StarsCount = Math.Clamp(request.StarsCount, 0, 3);
        await updateCastInstanceStarsCommand.HandleAsync(
            new UpdateCastInstanceStarsCommand(instanceId, request));

        var updated = (await getCastsQuery.HandleAsync(campaignId, instanceId)).FirstOrDefault();
        if (updated is null) return NotFound();

        // The card goes out with the event so a watching deck takes the new stars on from what it
        // is handed, the same shape the DM's own edit of a card broadcasts.
        await notifications.BroadcastCastInstanceUpdatedAsync(campaignId, new
        {
            campaignId,
            castInstanceId = instanceId,
            cast = mapper.ToCastInstanceResponse(updated),
        });

        return NoContent();
    }

    [HttpPatch("{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCastInstanceVisibility(Guid campaignId, Guid instanceId,
        [FromBody] UpdateCastInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateCastInstanceVisibilityCommand.HandleAsync(new UpdateCastInstanceVisibilityCommand(instanceId, request));

        // Broadcast through the notification service rather than the hub context directly: it is
        // the one place that records every send, which is what the Admin's SignalR inspector reads
        // (see AdminSignalRController). The event the clients receive is unchanged.
        await notifications.BroadcastCardVisibilityChangedAsync(campaignId, new CardVisibilityChangedEvent
        {
            CampaignId = campaignId,
            InstanceId = instanceId,
            CardType   = "cast",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpDelete("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteCast(Guid campaignId, Guid instanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteCastInstanceCommand.HandleAsync(new DeleteCastInstanceCommand(instanceId));

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

        return NoContent();
    }

    // ── Faction Symbols ────────────────────────────────────────────────────────

    [HttpPatch("{instanceId}/faction-symbols")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignFactionsToCast(Guid campaignId, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        request.DmUserId = userRetriever.GetUserId(User);
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(campaignId, instanceId, request));

        return NoContent();
    }

    [HttpPatch("{instanceId}/player-faction-symbols")]
    [Authorize]
    public async Task<IActionResult> AssignPlayerFactionsToCast(Guid campaignId, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        request.DmUserId = null;
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(campaignId, instanceId, request));

        await notifications.BroadcastFactionSymbolAssignedAsync(campaignId, new
        {
            campaignId = campaignId.ToString(),
            instanceId = instanceId.ToString(),
            entityType = "cast",
            factionInstanceIds = request.FactionSymbols.Select(s => s.FactionInstanceId).ToList(),
            tickCount = DateTime.UtcNow.Ticks
        });

        return NoContent();
    }

    [HttpPost("{id}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid campaignId, Guid id, [FromForm] UploadCastImageRequest request)
    {
        var validationResult = await fileValidationService.ValidateFileAsync(request.File, 20 * 1024 * 1024,
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);
        var userId = userRetriever.GetUserId(User);
        var (success, _) = await uploadCastImageCommandHandler.HandleAsync(
            new UploadCastImageCommand(request.SourceCastId, userId, request.File.OpenReadStream(), validationResult.DetectedContentType));

        if (!success)
        {
            return NotFound();
        }

        await notifications.BroadcastCastInstanceUpdatedAsync(campaignId, new
        {
            campaignId = campaignId,
            castInstanceId = id,
        });

        return Ok();
    }
}