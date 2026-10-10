using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/**
 * The cast travel write, and the card it moves.
 *
 * The file is named for the v2 controllers because this is the v2 campaign shell's own write for
 * a card it draws (`cc-cast-travel` sends the PATCH below), even though the route it serves is the
 * campaign-shaped one the v1 pages already call (`api/campaigns/...`): the two must not drift, so
 * there is one route and one action rather than a v2 twin. The class keeps its own name, as the
 * other v2-named files in this folder do (see v2CampaignCastsController.cs).
 */
[ApiController]
[Route("api/campaigns/{campaignId}/casts/{castInstanceId}")]
[Authorize]
public class CampaignCastTravelController(
    ITravelCastInstanceCommandHandler travelCommand,
    IUserRetriever userRetriever,
    ICampaignReadRepository campaignReadRepository,
    ICampaignWebMapper campaignMapper,
    IFilenameService filenameService,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));
    [HttpGet]
    public async Task<IActionResult> GetCastInstance(Guid campaignId, Guid castInstanceId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var cast = await campaignReadRepository.GetCastInstanceByIdAsync(castInstanceId);
        if (cast is null || cast.CampaignId != campaignId)
            return NotFound();

        var campaign = await campaignReadRepository.GetByIdAsync(campaignId);
        if (campaign is not null)
            filenameService.AddImageUrls(campaign.DmUserId, Guid.Empty, [], [], [cast], []);

        var response = campaignMapper.ToCastInstanceResponse(cast);
        return Ok(response);
    }

    [HttpPatch("travel")]
    public async Task<IActionResult> Travel(Guid campaignId, Guid castInstanceId, [FromBody] TravelCastRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        // A card that is not this campaign's own is not found rather than moved: the write is the
        // campaign's, and the id it is aimed at is part of what the caller claimed (see the
        // handler).
        var travelResponse = await travelCommand.HandleAsync(new TravelCastInstanceCommand(campaignId, castInstanceId, request));
        if (travelResponse is null) return NotFound();

        await notifications.BroadcastCastTraveledAsync(campaignId, new CastTraveledEvent
        {
            CampaignId = campaignId,
            CastInstanceId = castInstanceId,
            FromSublocationInstanceId = request.FromSublocationInstanceId,
            ToLocationInstanceId = request.LocationInstanceId,
            ToSublocationInstanceId = request.SublocationInstanceId,
            TraveledToTheParty = travelResponse.TraveledToTheParty,
            IsVisible = true
        });

        return NoContent();
    }
}
