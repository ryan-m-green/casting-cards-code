using CastLibrary.Logic.Commands.Ambiance;
using CastLibrary.Logic.Queries.Ambiance;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The GM's ambiance library. Ambiances belong to the GM's account and are shared across
/// every campaign the GM runs, so this is the journal's Soundtrack Library page.
/// </summary>
[ApiController]
[Route("api/ambiances")]
[Authorize(Roles = "DM,Admin")]
public class GmAmbiancesController(
    ICreateAmbianceCommandHandler createCommand,
    IUpdateAmbianceCommandHandler updateCommand,
    IDeleteAmbianceCommandHandler deleteCommand,
    IGetAmbiancesQueryHandler getAmbiancesQuery,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var domains = await getAmbiancesQuery.HandleAsync(
            new GetAmbiancesQuery(userRetriever.GetUserId(User)));
        return Ok(domains);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAmbianceRequest request)
    {
        request.Items ??= [];
        var validationError = Validate(request.Title, request.Items);
        if (validationError is not null) return BadRequest(validationError);

        var domain = await createCommand.HandleAsync(
            new CreateAmbianceCommand(userRetriever.GetUserId(User), null, request.Title, ToInputs(request.Items), request.RandomizeMusic));

        return CreatedAtAction(nameof(GetAll), null, domain);
    }

    [HttpPatch("{ambianceId}")]
    public async Task<IActionResult> Update(Guid ambianceId, [FromBody] UpdateAmbianceRequest request)
    {
        request.Items ??= [];
        var validationError = Validate(request.Title, request.Items);
        if (validationError is not null) return BadRequest(validationError);

        var domain = await updateCommand.HandleAsync(
            new UpdateAmbianceCommand(ambianceId, request.Title, ToInputs(request.Items), request.RandomizeMusic));

        return Ok(domain);
    }

    [HttpDelete("{ambianceId}")]
    public async Task<IActionResult> Delete(Guid ambianceId)
    {
        await deleteCommand.HandleAsync(new DeleteAmbianceCommand(ambianceId));

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