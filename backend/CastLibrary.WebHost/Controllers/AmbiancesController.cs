using CastLibrary.Logic.Commands.Ambiance;
using CastLibrary.Logic.Queries.Ambiance;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The ambiance panel as a campaign sees it. Ambiances are the GM's own library, global
/// to every campaign the GM runs, so this panel shows the GM's whole library and records a
/// campaign link for anything built from here.
/// </summary>
[ApiController]
[Route("api/campaigns/{campaignId}/ambiances")]
[Authorize(Roles = "DM,Admin")]
public class AmbiancesController(
    ICreateAmbianceCommandHandler createCommand,
    IUpdateAmbianceCommandHandler updateCommand,
    IDeleteAmbianceCommandHandler deleteCommand,
    IGetAmbiancesQueryHandler getAmbiancesQuery,
    ICampaignReadRepository campaignReadRepository,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private async Task<Guid?> OwnerOfAsync(Guid campaignId)
    {
        var campaign = await campaignReadRepository.GetByIdAsync(campaignId);
        return campaign?.DmUserId;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var owner = await OwnerOfAsync(campaignId);
        if (owner is null) return NotFound("Campaign not found");

        var domains = await getAmbiancesQuery.HandleAsync(new GetAmbiancesQuery(owner.Value));
        return Ok(domains);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreateAmbianceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var owner = await OwnerOfAsync(campaignId);
        if (owner is null) return NotFound("Campaign not found");

        request.Items ??= [];
        var validationError = Validate(request.Title, request.Items);
        if (validationError is not null) return BadRequest(validationError);

        var domain = await createCommand.HandleAsync(
            new CreateAmbianceCommand(owner.Value, campaignId, request.Title, ToInputs(request.Items), request.RandomizeMusic));

        // An ambiance is the campaign's own arrangement of its soundtracks, so a second client's
        // panel has to hear about it: the ambiance goes out as the campaign now holds it, and that
        // panel takes the change on from what it is handed rather than reading the list back.
        await notifications.BroadcastAmbianceChangedAsync(campaignId, new
        {
            campaignId,
            ambianceId = domain.Id,
            ambiance = domain,
        });

        return CreatedAtAction(nameof(GetAll), new { campaignId }, domain);
    }

    [HttpPatch("{ambianceId}")]
    public async Task<IActionResult> Update(Guid campaignId, Guid ambianceId, [FromBody] UpdateAmbianceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        request.Items ??= [];
        var validationError = Validate(request.Title, request.Items);
        if (validationError is not null) return BadRequest(validationError);

        var domain = await updateCommand.HandleAsync(
            new UpdateAmbianceCommand(ambianceId, request.Title, ToInputs(request.Items), request.RandomizeMusic));

        await notifications.BroadcastAmbianceChangedAsync(campaignId, new
        {
            campaignId,
            ambianceId = domain.Id,
            ambiance = domain,
        });

        return Ok(domain);
    }

    [HttpDelete("{ambianceId}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid ambianceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        await deleteCommand.HandleAsync(new DeleteAmbianceCommand(ambianceId));

        // The ambiance is gone: the event carries the id alone, which is how a watcher is told to
        // drop it (see cc-soundtracks).
        await notifications.BroadcastAmbianceChangedAsync(campaignId, new
        {
            campaignId,
            ambianceId,
        });

        return NoContent();
    }

    private static List<AmbianceItemInput> ToInputs(List<AmbianceItemRequest> items) =>
        items.Select(i => new AmbianceItemInput
        {
            SoundtrackId = i.SoundtrackId,
            Volume = i.Volume,
            PauseMode = i.PauseMode,
            PauseDelaySeconds = i.PauseDelaySeconds,
            PauseMinSeconds = i.PauseMinSeconds,
            PauseMaxSeconds = i.PauseMaxSeconds
        }).ToList();

    private static string Validate(string title, List<AmbianceItemRequest> items)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
            return "Title is required and must not exceed 200 characters.";

        foreach (var item in items)
        {
            if (item.SoundtrackId == Guid.Empty)
                return "Each ambiance item must reference a soundtrack.";

            switch (item.PauseMode)
            {
                case "none":
                    break;
                case "manual":
                    if (item.PauseDelaySeconds is null || item.PauseDelaySeconds < 1 || item.PauseDelaySeconds > 3600)
                        return "Manual pause delay must be between 1 and 3600 seconds.";
                    break;
                case "random":
                    if (item.PauseMinSeconds is null || item.PauseMaxSeconds is null ||
                        item.PauseMinSeconds < 1 || item.PauseMaxSeconds > 3600 ||
                        item.PauseMinSeconds > item.PauseMaxSeconds)
                        return "Random pause range is invalid. Min must be >= 1, max <= 3600, and min <= max.";
                    break;
                default:
                    return "Pause mode must be 'none', 'manual', or 'random'.";
            }
        }

        return null;
    }
}
