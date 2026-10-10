using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/daycycle")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignDayCycleController(
    IGetTimeOfDayQueryHandler getTimeOfDayQuery,
    IUpsertTimeOfDayCommandHandler upsertTimeOfDayCommand,
    IUpdateCursorPositionCommandHandler updateCursorCommand,
    IUpdateSlicePlayerNotesCommandHandler updatePlayerNotesCommand,
    IUpdateSliceDmNotesCommandHandler updateDmNotesCommand,
    IAdvanceDayCommandHandler advanceDayCommand,
    ICampaignWebMapper mapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notificationService) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetTimeOfDay(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var timeOfDay = await getTimeOfDayQuery.HandleAsync(campaignId);
        if (timeOfDay is null)
        {
            return NotFound();
        }

        var response = mapper.ToTimeOfDayResponse(timeOfDay);
        return Ok(response);
    }

    [HttpPut]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpsertTimeOfDay(Guid campaignId, [FromBody] UpsertTimeOfDayRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        if (request.DayLengthHours <= 0)
            return BadRequest("Day length must be greater than zero.");

        if (!request.Slices.Any())
            return BadRequest("At least one slice is required.");

        var sliceTotal = request.Slices.Sum(s => s.DurationHours);
        if (Math.Abs((double)(sliceTotal - request.DayLengthHours)) > 0.01)
            return BadRequest($"Slice durations ({sliceTotal}h) must sum to day length ({request.DayLengthHours}h).");

        var timeOfDay = await upsertTimeOfDayCommand.HandleAsync(new UpsertTimeOfDayCommand(campaignId, request));
        var response = mapper.ToTimeOfDayResponse(timeOfDay);

        await notificationService.BroadcastTimeOfDayUpdatedAsync(campaignId, response);

        return Ok(response);
    }

    [HttpPatch("cursor")]
    public async Task<IActionResult> UpdateCursor(Guid campaignId,
        [FromBody] UpdateCursorPositionRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var clamped = Math.Max(0, Math.Min(100, request.PositionPercent));
        await updateCursorCommand.HandleAsync(new UpdateCursorPositionCommand(campaignId, clamped));

        await notificationService.BroadcastTimeCursorMovedAsync(campaignId, 
            new { campaignId, positionPercent = clamped });

        return NoContent();
    }

    [HttpPatch("advance-day")]
    public async Task<IActionResult> AdvanceDay(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var daysPassed = await advanceDayCommand.HandleAsync(new AdvanceDayCommand(campaignId));

        await notificationService.BroadcastDayAdvancedAsync(campaignId, 
            new { campaignId, daysPassed });

        await notificationService.BroadcastTimeCursorMovedAsync(campaignId, 
            new { campaignId, positionPercent = 0 });

        return NoContent();
    }

    [HttpPatch("slices/{sliceId}/player-notes")]
    public async Task<IActionResult> UpdatePlayerNotes(Guid campaignId, Guid sliceId,
        [FromBody] UpdateSlicePlayerNotesRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await updatePlayerNotesCommand.HandleAsync(
            new UpdateSlicePlayerNotesCommand(sliceId, request.PlayerNotes));

        await notificationService.BroadcastPlayerNotesUpdatedAsync(campaignId, 
            new { campaignId, sliceId, playerNotes = request.PlayerNotes });

        return NoContent();
    }

    [HttpPatch("slices/{sliceId}/gm-notes")]
    public async Task<IActionResult> UpdateDmNotes(Guid campaignId, Guid sliceId,
        [FromBody] UpdateSliceDmNotesRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateDmNotesCommand.HandleAsync(
            new UpdateSliceDmNotesCommand(sliceId, request.DmNotes));

        await notificationService.BroadcastDmNotesUpdatedAsync(campaignId, 
            new { campaignId, sliceId, dmNotes = request.DmNotes });

        return NoContent();
    }
}