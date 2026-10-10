using CastLibrary.Logic.Commands.CampaignChronicles;
using CastLibrary.Logic.Queries.CampaignChronicles;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The standalone (v2) campaign chronicle: the date-ordered feed and the "send to chronicle" write.
/// The session-grouped chronicle endpoints were retired with the campaign_session_* tables.
/// </summary>
[ApiController]
[Route("api/campaigns/{campaignId}/chronicles")]
[Authorize]
public class CampaignChroniclesController(
    IAddChronicleCommandHandler addChronicleCommand,
    IGetChronicleFeedQueryHandler getChronicleFeedQuery,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerIsMemberOrOwner(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    // v2 - Standalone chronicle feed for the campaign (date-ordered, no session grouping).
    [HttpGet("feed")]
    [Authorize(Roles = "Player,DM,Admin")]
    public async Task<IActionResult> GetChronicleFeed(
        Guid campaignId,
        [FromQuery] string[] contentTypes = null,
        [FromQuery] int limit = 200)
    {
        if (!await CallerIsMemberOrOwner(campaignId)) return Forbid();

        var isDm = await CallerOwns(campaignId);
        var entries = await getChronicleFeedQuery.HandleAsync(
            new GetChronicleFeedQuery(campaignId, isDm, contentTypes, limit));

        return Ok(entries);
    }

    // v2 - Add content of any supported type to the standalone chronicle feed (copy, no session).
    // content_type is dispatched to a per-type archive strategy.
    [HttpPost]
    [Authorize(Roles = "Player,DM,Admin")]
    public async Task<IActionResult> AddToChronicle(
        Guid campaignId,
        [FromBody] CreateChronicleRequest request)
    {
        if (!await CallerIsMemberOrOwner(campaignId)) return Forbid();

        // Players may chronicle their own visible content, but never GM-only entries.
        var isDm = await CallerOwns(campaignId);
        if (!isDm && request.IsGmOnly == true) return Forbid();

        try
        {
            var chronicleId = await addChronicleCommand.HandleAsync(new AddChronicleCommand(campaignId, request));

            await notifications.BroadcastChronicleAddedAsync(campaignId, new { campaignId, chronicleId });

            return Ok(new { chronicleId });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
