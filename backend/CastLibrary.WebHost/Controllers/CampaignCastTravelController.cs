using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/casts/{castInstanceId}")]
[Authorize]
public class CampaignCastTravelController(
    ITravelCastInstanceCommandHandler travelCommand,
    IUserRetriever userRetriever,
    ICampaignReadRepository campaignReadRepository,
    ICampaignWebMapper campaignMapper,
    IFilenameService filenameService,
    IHubContext<CampaignHub> hubContext,
    ICampaignAccessService campaignAccess) : ControllerBase
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

        var travelResponse = await travelCommand.HandleAsync(new TravelCastInstanceCommand(campaignId, castInstanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CastTravelled", new CastTravelledEvent
        {
            CampaignId = campaignId,
            CastInstanceId = castInstanceId,
            FromSublocationInstanceId = request.FromSublocationInstanceId,
            ToLocationInstanceId = request.LocationInstanceId,
            ToSublocationInstanceId = request.SublocationInstanceId,
            TraveledToTheParty = travelResponse.TraveledToTheParty
        });

        return NoContent();
    }
}
