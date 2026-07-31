using CastLibrary.Logic.Commands.Soundtrack;
using CastLibrary.Logic.Queries.Soundtrack;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/soundtracks")]
[Authorize(Roles = "DM,Admin")]
public class SoundtracksController(
    IUploadSoundtrackCommandHandler uploadCommand,
    IDeleteSoundtrackCommandHandler deleteCommand,
    IUpdateSoundtrackCommandHandler updateCommand,
    IGetCampaignSoundtracksQueryHandler getSoundtracksQuery,
    ICampaignReadRepository campaignReadRepository,
    IHubContext<CampaignHub> hubContext,
    IFileValidationService fileValidationService,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var domains = await getSoundtracksQuery.HandleAsync(new GetCampaignSoundtracksQuery(campaignId));
        return Ok(domains);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(Guid campaignId, IFormFile file, [FromForm] string title, [FromForm] int volume = 80, [FromForm] bool isLoop = false)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
            return BadRequest("Title is required and must not exceed 200 characters.");

        if (volume < 0 || volume > 100)
            return BadRequest("Volume must be between 0 and 100.");

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
            new UploadSoundtrackCommand(campaignId, title, file.FileName, file.OpenReadStream(), resolvedContentType, volume, isLoop));

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

        var domain = await updateCommand.HandleAsync(
            new UpdateSoundtrackCommand(soundtrackId, request.Title, request.Volume, request.IsLoop, request.LoopDelaySeconds));

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

public class UpdateSoundtrackRequest
{
    public string Title { get; set; } = string.Empty;
    public int Volume { get; set; } = 80;
    public bool IsLoop { get; set; }
    public int? LoopDelaySeconds { get; set; }
}
