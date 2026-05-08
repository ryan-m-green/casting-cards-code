using CastLibrary.Logic.Commands.Sublocation;
using CastLibrary.Logic.Queries.Sublocation;
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
[Route("api/campaigns/{campaignId}/sublocation-player-notes")]
[Authorize]
public class SublocationPlayerNotesController(
    IGetSublocationPlayerNotesQueryHandler getQuery,
    IUpsertSublocationPlayerNotesCommandHandler upsertCommand,
    ICampaignSublocationPlayerNotesMapper mapper,
    IHubContext<CampaignHub> hubContext,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));
    [HttpGet("{sublocationInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid sublocationInstanceId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await getQuery.HandleAsync(campaignId, sublocationInstanceId);
        var response = domain is null
            ? mapper.ToEmpty(campaignId, sublocationInstanceId)
            : mapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{sublocationInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid sublocationInstanceId, [FromBody] UpsertSublocationPlayerNotesRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await upsertCommand.HandleAsync(
            new UpsertSublocationPlayerNotesCommand(campaignId, sublocationInstanceId, request));
        var response = mapper.ToResponse(domain);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("NoteUpdated", new { entityType = "sublocation", instanceId = sublocationInstanceId, campaignId });

        return Ok(response);
    }
}
