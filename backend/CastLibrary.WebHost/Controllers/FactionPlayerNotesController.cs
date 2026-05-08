using CastLibrary.Logic.Commands.Faction;
using CastLibrary.Logic.Queries.Faction;
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
[Route("api/campaigns/{campaignId}/faction-player-notes")]
[Authorize]
public class FactionPlayerNotesController(
    IGetFactionPlayerNotesQueryHandler getQuery,
    IUpsertFactionPlayerNotesCommandHandler upsertCommand,
    ICampaignFactionPlayerNotesMapper mapper,
    IHubContext<CampaignHub> hubContext,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));
    [HttpGet("{factionInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var domain = await getQuery.HandleAsync(campaignId, factionInstanceId);
        var response = domain is null
            ? mapper.ToEmpty(campaignId, factionInstanceId)
            : mapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{factionInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid factionInstanceId, [FromBody] UpsertFactionPlayerNotesRequest request)
    {
        var domain = await upsertCommand.HandleAsync(
            new UpsertFactionPlayerNotesCommand(campaignId, factionInstanceId, request));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("NoteUpdated", new { entityType = "faction", instanceId = factionInstanceId, campaignId });

        return Ok(mapper.ToResponse(domain));
    }
}
