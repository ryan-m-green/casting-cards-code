using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Exceptions;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/castinstances")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignCastsController(
    IGetCampaignCastInstancesQueryHandler getCastsQuery,
    IAddCastToCampaignCommandHandler addCastCommand,
    IUpdateCastInstanceCommandHandler updateCastInstanceCommand,
    IDeleteCastInstanceCommandHandler deleteCastInstanceCommand,
    IUpdateCastInstanceVisibilityCommandHandler updateCastInstanceVisibilityCommand,
    IAssignFactionToCastCommandHandler assignFactionToCastCommand,
    ICampaignWebMapper mapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetCastInstances(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var casts = await getCastsQuery.HandleAsync(campaignId);
        var response = casts.Select(mapper.ToCastInstanceResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{castInstanceId}")]
    public async Task<IActionResult> GetCastInstance(Guid campaignId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var casts = await getCastsQuery.HandleAsync(campaignId, castInstanceId);
        if (!casts.Any())
        {
            return NotFound();
        }

        var response = mapper.ToCastInstanceResponse(casts.First());
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddCast(Guid campaignId, [FromBody] AddCastToCampaignRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var instance = await addCastCommand.HandleAsync(new AddCastToCampaignCommand(campaignId, request));
        if (instance is null)
        {
            return NotFound();
        }

        var response = mapper.ToCastInstanceResponse(instance);

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return Ok(response);
    }

    [HttpPatch("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCast(Guid campaignId, Guid instanceId,
        [FromBody] UpdateCastInstanceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateCastInstanceCommand.HandleAsync(new UpdateCastInstanceCommand(instanceId, request, dmUserId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CastInstanceUpdated", new
        {
            campaignId     = campaignId,
            castInstanceId = instanceId,
        });

        return NoContent();
    }

    [HttpPatch("{instanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCastInstanceVisibility(Guid campaignId, Guid instanceId,
        [FromBody] UpdateCastInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateCastInstanceVisibilityCommand.HandleAsync(new UpdateCastInstanceVisibilityCommand(instanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = campaignId,
            InstanceId = instanceId,
            CardType   = "cast",
            IsVisible  = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    [HttpDelete("{instanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteCast(Guid campaignId, Guid instanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteCastInstanceCommand.HandleAsync(new DeleteCastInstanceCommand(instanceId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return NoContent();
    }

    // ── Faction Symbols ────────────────────────────────────────────────────────

    [HttpPatch("{instanceId}/faction-symbols")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignFactionsToCast(Guid campaignId, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        request.DmUserId = userRetriever.GetUserId(User);
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(campaignId, instanceId, request));

        return NoContent();
    }

    [HttpPatch("{instanceId}/player-faction-symbols")]
    [Authorize]
    public async Task<IActionResult> AssignPlayerFactionsToCast(Guid campaignId, Guid instanceId,
        [FromBody] AssignFactionToCastRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        request.DmUserId = null;
        await assignFactionToCastCommand.HandleAsync(
            new AssignFactionToCastCommand(campaignId, instanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("FactionSymbolAssigned", new
        {
            campaignId = campaignId.ToString(),
            instanceId = instanceId.ToString(),
            entityType = "cast",
            factionInstanceIds = request.FactionSymbols.Select(s => s.FactionInstanceId).ToList(),
            tickCount = DateTime.UtcNow.Ticks
        });

        return NoContent();
    }
}