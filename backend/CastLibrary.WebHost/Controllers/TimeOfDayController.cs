using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/time-of-day")]
[Authorize]
public class TimeOfDayController(
    IGetTimeOfDayQueryHandler getQuery,
    IUpsertTimeOfDayCommandHandler upsertCommand,
    IUpdateCursorPositionCommandHandler updateCursorCommand,
    IUpdateSlicePlayerNotesCommandHandler updatePlayerNotesCommand,
    IUpdateSliceDmNotesCommandHandler updateDmNotesCommand,
    IAdvanceDayCommandHandler advanceDayCommand,
    IRewindDayCommandHandler rewindDayCommand,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid campaignId)
    {
        var tod = await getQuery.HandleAsync(campaignId);
        if (tod is null) return NotFound();
        return Ok(ToResponse(tod));
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(Guid campaignId, [FromBody] UpsertTimeOfDayRequest request)
    {
        if (request.DayLengthHours <= 0)
            return BadRequest("Day length must be greater than zero.");

        if (!request.Slices.Any())
            return BadRequest("At least one slice is required.");

        var sliceTotal = request.Slices.Sum(s => s.DurationHours);
        if (Math.Abs((double)(sliceTotal - request.DayLengthHours)) > 0.01)
            return BadRequest($"Slice durations ({sliceTotal}h) must sum to day length ({request.DayLengthHours}h).");

        var tod = await upsertCommand.HandleAsync(new UpsertTimeOfDayCommand(campaignId, request));
        var response = ToResponse(tod);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("TimeOfDayUpdated", response);

        return Ok(response);
    }

    [HttpPatch("cursor")]
    public async Task<IActionResult> UpdateCursor(Guid campaignId,
        [FromBody] UpdateCursorPositionRequest request)
    {
        var clamped = Math.Max(0, Math.Min(100, request.PositionPercent));
        await updateCursorCommand.HandleAsync(new UpdateCursorPositionCommand(campaignId, clamped));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("TimeCursorMoved", new { campaignId, positionPercent = clamped });

        return NoContent();
    }

    [HttpPatch("advance-day")]
    public async Task<IActionResult> AdvanceDay(Guid campaignId)
    {
        var daysPassed = await advanceDayCommand.HandleAsync(new AdvanceDayCommand(campaignId));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("DayAdvanced", new { campaignId, daysPassed });

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("TimeCursorMoved", new { campaignId, positionPercent = 0 });

        return NoContent();
    }

    [HttpPatch("rewind-day")]
    public async Task<IActionResult> RewindDay(Guid campaignId)
    {
        var daysPassed = await rewindDayCommand.HandleAsync(new RewindDayCommand(campaignId));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("DayAdvanced", new { campaignId, daysPassed });

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("TimeCursorMoved", new { campaignId, positionPercent = 0 });

        return NoContent();
    }

    [HttpPatch("slices/{sliceId}/player-notes")]
    public async Task<IActionResult> UpdatePlayerNotes(Guid campaignId, Guid sliceId,
        [FromBody] UpdateSlicePlayerNotesRequest request)
    {
        await updatePlayerNotesCommand.HandleAsync(
            new UpdateSlicePlayerNotesCommand(sliceId, request.PlayerNotes));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("PlayerNotesUpdated", new { campaignId, sliceId, playerNotes = request.PlayerNotes });

        return NoContent();
    }

    [HttpPatch("slices/{sliceId}/dm-notes")]
    public async Task<IActionResult> UpdateDmNotes(Guid campaignId, Guid sliceId,
        [FromBody] UpdateSliceDmNotesRequest request)
    {
        await updateDmNotesCommand.HandleAsync(
            new UpdateSliceDmNotesCommand(sliceId, request.DmNotes));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("DmNotesUpdated", new { campaignId, sliceId, dmNotes = request.DmNotes });

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static TimeOfDayResponse ToResponse(CastLibrary.Shared.Domain.TimeOfDayDomain tod)
    {
        var total   = tod.Slices.Sum(s => s.DurationHours);
        decimal running = 0;

        return new TimeOfDayResponse
        {
            Id                    = tod.Id,
            CampaignId            = tod.CampaignId,
            DayLengthHours        = tod.DayLengthHours,
            CursorPositionPercent = tod.CursorPositionPercent,
            DaysPassed            = tod.DaysPassed,
            Slices = tod.Slices.Select(s =>
            {
                var start = total > 0 ? running / total * 100 : 0;
                running  += s.DurationHours;
                var end   = total > 0 ? running / total * 100 : 0;
                return new TimeOfDaySliceResponse
                {
                    Id            = s.Id,
                    Label         = s.Label,
                    Color         = s.Color,
                    DurationHours = s.DurationHours,
                    StartPercent  = Math.Round(start, 4),
                    EndPercent    = Math.Round(end,   4),
                    DmNotes       = s.DmNotes,
                    PlayerNotes   = s.PlayerNotes,
                };
            }).ToList(),
        };
    }
}
