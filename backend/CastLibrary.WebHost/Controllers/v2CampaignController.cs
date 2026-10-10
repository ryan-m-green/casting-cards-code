using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The campaign's own endpoints — the ones that belong to the campaign itself rather than to one of
/// the things standing in it: the world map it is drawn with, and the reveal that opens one of its
/// secrets to the players.
///
/// Revealing works for any secret of any card — a location's, a sublocation's, a cast's, a faction's
/// — so it is the campaign's own door, named once here rather than once per card type, and every
/// screen that reveals one (the v2 secrets section, the v1 detail pages) comes through it. The world
/// map moved here from the v1 CampaignsController, which held both as the campaign's own.
///
/// The secrets' own writes stay with the secrets they are made of (see CampaignSecretsController):
/// what hangs here is what the campaign does with any of them.
/// </summary>
[ApiController]
[Route("api/campaign/{campaignId}")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignController(
    IRevealSecretCommandHandler revealSecretCommand,
    IUploadCampaignWorldMapImageCommandHandler uploadWorldMapImageCommand,
    IFileValidationService fileValidationService,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    /// <summary>
    /// Reveals one of the campaign's secrets to the players, whichever card it hangs on.
    ///
    /// One door for every secret: the write is the same whether the secret was written on a
    /// location, a sublocation, a cast or a faction, and the broadcast says which of those it
    /// belongs to, so the clients that draw that card take it on (see SecretRevealedEvent, and the
    /// players' own sections and pages behind them).
    /// </summary>
    [HttpPost("secrets/{secretId}/reveal")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RevealSecret(Guid campaignId, Guid secretId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var secret = await revealSecretCommand.HandleAsync(new RevealSecretCommand(secretId, campaignId));
        if (secret is null) return NotFound();

        // Broadcast through the notification service rather than the hub context directly: it is the
        // one place that records every send, which is what the Admin's SignalR inspector reads — and
        // what lets it pair a send with the receipts the receiving clients report back (see
        // AdminSignalRController and SignalRInspector).
        await notifications.BroadcastPlayerSecretRevealedAsync(campaignId, new SecretRevealedEvent
        {
            SecretId = secretId,
            CampaignId = campaignId,
            CastInstanceId = secret.CastInstanceId,
            LocationInstanceId = secret.LocationInstanceId,
            SublocationInstanceId = secret.SublocationInstanceId,
            SecretContent = secret.Content,
        });

        var response = campaignMapper.ToSecretResponse(secret);
        return Ok(response);
    }

    /// <summary>
    /// Puts a new world map on the campaign. The campaign's own picture, so it is written with the
    /// campaign and read back with it (see CampaignResponse.WorldMapImageUrl).
    /// </summary>
    [HttpPost("worldmap-image")]
    [Authorize(Roles = "DM,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadWorldMapImage(Guid campaignId, IFormFile file)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var validationResult = await fileValidationService.ValidateFileAsync(file, 20 * 1024 * 1024,
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);

        var imageUrl = await uploadWorldMapImageCommand.HandleAsync(
            new UploadCampaignWorldMapImageCommand(campaignId, file.OpenReadStream(), validationResult.DetectedContentType));

        // The map belongs to the campaign, not to the screen that sent it up: every other client
        // draws the same picture, so they are handed the url the upload wrote — the key's own
        // version rides in it, so the new picture is not served from a cache (see
        // IImageStorageOperator.GetPublicUrl) — rather than reading the campaign back.
        //
        // Broadcast through the notification service for the same reason as the reveal above: it is
        // where the send is recorded, which is what the Admin's SignalR inspector pairs with the
        // receipts the receiving clients report back (see SignalRInspector).
        await notifications.BroadcastWorldMapImageChangedAsync(campaignId, new
        {
            campaignId,
            imageUrl,
        });

        return Ok(new { imageUrl });
    }
}
