using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/campaign-player-notes")]
[Authorize]
public class CampaignPlayerNotesController(
    IGetCampaignPlayerNotesQueryHandler getQuery,
    IUpsertCampaignPlayerNotesCommandHandler upsertCommand,
    ICampaignPlayerNotesMapper mapper,
    IHubContext<CampaignHub> hubContext,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));
    [HttpGet]
    public async Task<IActionResult> Get(Guid campaignId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await getQuery.HandleAsync(campaignId);
        var response = domain is null
            ? mapper.ToEmpty(campaignId)
            : mapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(
        Guid campaignId, [FromBody] UpsertCampaignPlayerNotesRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await upsertCommand.HandleAsync(
            new UpsertCampaignPlayerNotesCommand(campaignId, request));
        var response = mapper.ToResponse(domain);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("NoteUpdated", new { entityType = "campaign", instanceId = campaignId, campaignId });

        return Ok(response);
    }
}
