using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
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
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid campaignId)
    {
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
        var domain = await upsertCommand.HandleAsync(
            new UpsertCampaignPlayerNotesCommand(campaignId, request));
        var response = mapper.ToResponse(domain);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("NoteUpdated", new { entityType = "campaign", instanceId = campaignId, campaignId });

        return Ok(response);
    }
}
