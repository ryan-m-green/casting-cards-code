using CastLibrary.Logic.Commands.Soundtrack;
using CastLibrary.Logic.Queries.Soundtrack;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The GM's soundtrack library. Soundtracks belong to the GM's account and are shared
/// across every campaign the GM runs, so this is the journal's Soundtrack Library page.
/// </summary>
[ApiController]
[Route("api/soundtracks")]
[Authorize(Roles = "DM,Admin")]
public class GmSoundtracksController(
    IUploadSoundtrackCommandHandler uploadCommand,
    IDeleteSoundtrackCommandHandler deleteCommand,
    IUpdateSoundtrackCommandHandler updateCommand,
    IGetSoundtracksQueryHandler getSoundtracksQuery,
    IFileValidationService fileValidationService,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var domains = await getSoundtracksQuery.HandleAsync(
            new GetSoundtracksQuery(userRetriever.GetUserId(User)));
        return Ok(domains);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string title, [FromForm] int volume = 80, [FromForm] bool isLoop = false, [FromForm] string kind = "music")
    {
        if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
            return BadRequest("Title is required and must not exceed 200 characters.");

        if (volume < 0 || volume > 100)
            return BadRequest("Volume must be between 0 and 100.");

        if (kind is not ("music" or "sound_effect"))
            return BadRequest("Kind must be either 'music' or 'sound_effect'.");

        var audioTypes = new[] { "audio/mpeg", "audio/wav", "audio/wave", "audio/ogg", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/flac" };
        var validationResult = await fileValidationService.ValidateFileAsync(file, 25 * 1024 * 1024, audioTypes);

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);

        var domain = await uploadCommand.HandleAsync(
            new UploadSoundtrackCommand(userRetriever.GetUserId(User), null, title, file.FileName, file.OpenReadStream(), validationResult.DetectedContentType, volume, isLoop, kind));

        return CreatedAtAction(nameof(GetAll), null, domain);
    }

    [HttpPatch("{soundtrackId}")]
    public async Task<IActionResult> Update(Guid soundtrackId, [FromBody] UpdateSoundtrackRequest request)
    {
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

        return Ok(domain);
    }

    [HttpDelete("{soundtrackId}")]
    public async Task<IActionResult> Delete(Guid soundtrackId)
    {
        await deleteCommand.HandleAsync(new DeleteSoundtrackCommand(soundtrackId));

        return NoContent();
    }
}