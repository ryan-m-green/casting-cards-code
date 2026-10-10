using CastLibrary.Logic.Commands.Ambiance;
using CastLibrary.Logic.Queries.Ambiance;
using CastLibrary.Logic.Services;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/ambiances")]
[Authorize(Roles = "DM,Admin")]
public class AmbiancesController(
    ICreateAmbianceCommandHandler createCommand,
    IUpdateAmbianceCommandHandler updateCommand,
    IDeleteAmbianceCommandHandler deleteCommand,
    IGetCampaignAmbiancesQueryHandler getAmbiancesQuery,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var domains = await getAmbiancesQuery.HandleAsync(new GetCampaignAmbiancesQuery(campaignId));
        return Ok(domains);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreateAmbianceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        request.Items ??= [];
        var validationError = Validate(request.Title, request.Items);
        if (validationError is not null) return BadRequest(validationError);

        var domain = await createCommand.HandleAsync(
            new CreateAmbianceCommand(campaignId, request.Title, ToInputs(request.Items), request.RandomizeMusic));

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

        return Ok(domain);
    }

    [HttpDelete("{ambianceId}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid ambianceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

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

public class AmbianceItemRequest
{
    public Guid SoundtrackId { get; set; }
    public int Volume { get; set; } = 80;
    public string PauseMode { get; set; } = "none";
    public int? PauseDelaySeconds { get; set; }
    public int? PauseMinSeconds { get; set; }
    public int? PauseMaxSeconds { get; set; }
}

public class CreateAmbianceRequest
{
    public string Title { get; set; } = string.Empty;
    public bool RandomizeMusic { get; set; }
    public List<AmbianceItemRequest> Items { get; set; } = [];
}

public class UpdateAmbianceRequest
{
    public string Title { get; set; } = string.Empty;
    public bool RandomizeMusic { get; set; }
    public List<AmbianceItemRequest> Items { get; set; } = [];
}
