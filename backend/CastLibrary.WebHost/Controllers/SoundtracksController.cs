using CastLibrary.Logic.Commands.Soundtrack;
using CastLibrary.Logic.Queries.Soundtrack;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The soundtrack panel as a campaign sees it. Soundtracks are the GM's own library,
/// global to every campaign the GM runs, so this panel shows the GM's whole library and
/// records a campaign link for anything uploaded from here.
/// </summary>
[ApiController]
[Route("api/campaigns/{campaignId}/soundtracks")]
[Authorize(Roles = "DM,Admin")]
public class SoundtracksController(
    IUploadSoundtrackCommandHandler uploadCommand,
    IDeleteSoundtrackCommandHandler deleteCommand,
    IUpdateSoundtrackCommandHandler updateCommand,
    IGetSoundtracksQueryHandler getSoundtracksQuery,
    ICampaignReadRepository campaignReadRepository,
    IHubContext<CampaignHub> hubContext,
    IFileValidationService fileValidationService,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess) : ControllerBase
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

        var domains = await getSoundtracksQuery.HandleAsync(new GetSoundtracksQuery(owner.Value));
        return Ok(domains);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(Guid campaignId, IFormFile file, [FromForm] string title, [FromForm] int volume = 80, [FromForm] bool isLoop = false, [FromForm] string kind = "music")
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var owner = await OwnerOfAsync(campaignId);
        if (owner is null) return NotFound("Campaign not found");

        if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
            return BadRequest("Title is required and must not exceed 200 characters.");

        if (volume < 0 || volume > 100)
            return BadRequest("Volume must be between 0 and 100.");

        if (kind is not ("music" or "sound_effect"))
            return BadRequest("Kind must be either 'music' or 'sound_effect'.");

        var audioTypes = new[] { "audio/mpeg", "audio/wav", "audio/wave", "audio/ogg", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/flac" };
        var validationResult = await fileValidationService.ValidateFileAsync(file, 25 * 1024 * 1024, audioTypes);

        if (!validationResult.IsValid)
        {
            Console.WriteLine($"File validation failed: {validationResult.ErrorMessage}");
            Console.WriteLine($"File name: {file.FileName}, Content-Type: {file.ContentType}, Size: {file.Length}");
            return BadRequest(validationResult.ErrorMessage);
        }

        var resolvedContentType = validationResult.DetectedContentType;

        var domain = await uploadCommand.HandleAsync(
            new UploadSoundtrackCommand(owner.Value, campaignId, title, file.FileName, file.OpenReadStream(), resolvedContentType, volume, isLoop, kind));

        return CreatedAtAction(nameof(GetAll), new { campaignId }, domain);
    }

    [HttpPatch("{soundtrackId}")]
    public async Task<IActionResult> Update(Guid campaignId, Guid soundtrackId, [FromBody] UpdateSoundtrackRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            return BadRequest("Title is required and must not exceed 200 characters.");

        if (request.Volume < 0 || request.Volume > 100)
            return BadRequest("Volume must be between 0 and 100.");

        if (request.LoopDelaySeconds.HasValue && (request.LoopDelaySeconds < 1 || request.LoopDelaySeconds > 60))
            return BadRequest("Loop delay must be between 1 and 60 seconds.");

        if (request.Kind is not ("music" or "sound_effect"))
            return BadRequest("Kind must be either 'music' or 'sound_effect'.");

        var domain = await updateCommand.HandleAsync(
            new UpdateSoundtrackCommand(soundtrackId, request.Title, request.Volume, request.IsLoop, request.LoopDelaySeconds, request.Kind));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("SoundtrackVolumeChanged", new { campaignId, soundtrackId, volume = domain.Volume });

        return Ok(domain);
    }

    [HttpDelete("{soundtrackId}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid soundtrackId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        await deleteCommand.HandleAsync(new DeleteSoundtrackCommand(soundtrackId));

        return NoContent();
    }

    [HttpPost("{soundtrackId}/trigger")]
    public async Task<IActionResult> Trigger(Guid campaignId, Guid soundtrackId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var campaign = await campaignReadRepository.GetByIdAsync(campaignId);
        if (campaign is null)
            return NotFound("Campaign not found");

        var userId = userRetriever.GetUserId(User);

        await hubContext.Clients.User(userId.ToString())
            .SendAsync("SoundtrackTriggered", new { campaignId, soundtrackId });

        return NoContent();
    }
}
