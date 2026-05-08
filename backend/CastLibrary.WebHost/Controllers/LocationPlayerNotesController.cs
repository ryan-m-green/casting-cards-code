using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Queries.Location;
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
[Route("api/campaigns/{campaignId}/location-player-notes")]
[Authorize]
public class LocationPlayerNotesController(
    IGetLocationPlayerNotesQueryHandler getQuery,
    IUpsertLocationPlayerNotesCommandHandler upsertCommand,
    ICampaignLocationPlayerNotesMapper mapper,
    IHubContext<CampaignHub> hubContext,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));
    [HttpGet("{locationInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid locationInstanceId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await getQuery.HandleAsync(campaignId, locationInstanceId);
        var response = domain is null
            ? mapper.ToEmpty(campaignId, locationInstanceId)
            : mapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{locationInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid locationInstanceId, [FromBody] UpsertLocationPlayerNotesRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await upsertCommand.HandleAsync(
            new UpsertLocationPlayerNotesCommand(campaignId, locationInstanceId, request));
        var response = mapper.ToResponse(domain);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("NoteUpdated", new { entityType = "location", instanceId = locationInstanceId, campaignId });

        return Ok(response);
    }
}
