using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.Faction;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.Faction;
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
[Route("api/campaign/{campaignId}/factions")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignFactionsController(
    IGetCampaignFactionInstancesQueryHandler getFactionInstancesQuery,
    IGetPlayerCampaignFactionInstancesQueryHandler getPlayerFactionInstancesQuery,
    IAddFactionToCampaignCommandHandler addFactionCommand,
    IDeleteFactionInstanceCommandHandler deleteFactionInstanceCommand,
    IUpdateFactionInstanceCommandHandler updateFactionInstanceCommand,
    IUpdateFactionInstanceVisibilityCommandHandler updateFactionInstanceVisibilityCommand,
    IAddFactionSublocationCommandHandler addFactionSublocationCommand,
    IRemoveFactionSublocationCommandHandler removeFactionSublocationCommand,
    ISetFactionSublocationPrimaryCommandHandler setFactionSublocationPrimaryCommand,
    IClearFactionSublocationPrimaryCommandHandler clearFactionSublocationPrimaryCommand,
    IAddFactionCastMemberCommandHandler addFactionCastMemberCommand,
    IRemoveFactionCastMemberCommandHandler removeFactionCastMemberCommand,
    ISetFactionCastMemberPrimaryCommandHandler setFactionCastMemberPrimaryCommand,
    IClearFactionCastMemberPrimaryCommandHandler clearFactionCastMemberPrimaryCommand,
    IAddFactionRelationshipCommandHandler addFactionRelationshipCommand,
    IRemoveFactionRelationshipCommandHandler removeFactionRelationshipCommand,
    ICampaignFactionInstanceWebMapper factionMapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetFactions(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        var instances = await getFactionInstancesQuery.HandleAsync(campaignId, dmUserId);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    [HttpGet("player")]
    public async Task<IActionResult> GetPlayerFactions(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var instances = await getPlayerFactionInstancesQuery.HandleAsync(campaignId);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFaction(Guid campaignId, [FromBody] AddFactionToCampaignRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        var instance = await addFactionCommand.HandleAsync(new AddFactionToCampaignCommand(campaignId, dmUserId, request));
        if (instance is null) return NotFound();

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return Ok(factionMapper.ToResponse(instance));
    }

    [HttpDelete("{factionInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteFaction(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteFactionInstanceCommand.HandleAsync(new DeleteFactionInstanceCommand(campaignId, factionInstanceId));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("FactionRemoved", new
        {
            campaignId = campaignId,
            factionInstanceId = factionInstanceId,
        });

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return NoContent();
    }

    [HttpPatch("{factionInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateFaction(Guid campaignId, Guid factionInstanceId,
        [FromBody] UpdateFactionInstanceRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await updateFactionInstanceCommand.HandleAsync(new UpdateFactionInstanceCommand(factionInstanceId, dmUserId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("FactionInstanceUpdated", new
        {
            campaignId = campaignId,
            factionInstanceId,
        });

        return NoContent();
    }

    [HttpPatch("{factionInstanceId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateFactionInstanceVisibility(Guid campaignId, Guid factionInstanceId,
        [FromBody] UpdateFactionInstanceVisibilityRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await updateFactionInstanceVisibilityCommand.HandleAsync(new UpdateFactionInstanceVisibilityCommand(factionInstanceId, request));

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("CardVisibilityChanged", new CardVisibilityChangedEvent
        {
            CampaignId = campaignId,
            InstanceId = factionInstanceId,
            CardType = "faction",
            IsVisible = request.IsVisibleToPlayers,
        });

        return NoContent();
    }

    // ── Faction ↔ Sublocation membership ─────────────────────────────────────

    [HttpPost("{factionInstanceId}/sublocations/{sublocationInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFactionSublocation(Guid campaignId, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await addFactionSublocationCommand.HandleAsync(factionInstanceId, sublocationInstanceId, dmUserId);
        return NoContent();
    }

    [HttpDelete("{factionInstanceId}/sublocations/{sublocationInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveFactionSublocation(Guid campaignId, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await removeFactionSublocationCommand.HandleAsync(factionInstanceId, sublocationInstanceId);
        return NoContent();
    }

    [HttpPatch("{factionInstanceId}/sublocations/{sublocationInstanceId}/primary")]
    public async Task<IActionResult> SetFactionSublocationPrimary(Guid campaignId, Guid factionInstanceId, Guid sublocationInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await setFactionSublocationPrimaryCommand.HandleAsync(factionInstanceId, sublocationInstanceId);
        return NoContent();
    }

    [HttpDelete("{factionInstanceId}/sublocations/primary")]
    public async Task<IActionResult> ClearFactionSublocationPrimary(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await clearFactionSublocationPrimaryCommand.HandleAsync(factionInstanceId);
        return NoContent();
    }

    // ── Faction ↔ Cast membership ─────────────────────────────────────────────

    [HttpPost("{factionInstanceId}/cast/{castInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFactionCastMember(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        await addFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId, dmUserId);
        return NoContent();
    }

    [HttpDelete("{factionInstanceId}/cast/{castInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveFactionCastMember(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await removeFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId);
        return NoContent();
    }

    [HttpPatch("{factionInstanceId}/cast/{castInstanceId}/primary")]
    public async Task<IActionResult> SetFactionCastMemberPrimary(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await setFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, castInstanceId);
        return NoContent();
    }

    [HttpDelete("{factionInstanceId}/cast/primary")]
    public async Task<IActionResult> ClearFactionCastMemberPrimary(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await clearFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId);
        return NoContent();
    }

    // ── Faction Relationships ─────────────────────────────────────────────────

    [HttpPost("{factionInstanceId}/relationships")]
    public async Task<IActionResult> AddFactionRelationship(Guid campaignId, Guid factionInstanceId,
        [FromBody] AddFactionRelationshipRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var dmUserId = userRetriever.IsPlayer(User) ? (Guid?)null : userRetriever.GetDmUserId(User);
        var relationship = await addFactionRelationshipCommand.HandleAsync(
            new AddFactionRelationshipCommand(campaignId, dmUserId, request));
        return Ok(new CampaignFactionRelationshipResponse
        {
            Id = relationship.Id,
            CampaignId = relationship.CampaignId,
            FactionInstanceIdA = relationship.FactionInstanceIdA,
            FactionInstanceIdB = relationship.FactionInstanceIdB,
            RelationshipType = relationship.RelationshipType,
            Strength = relationship.Strength,
            CreatedAt = relationship.CreatedAt,
            DmUserId = relationship.DmUserId,
        });
    }

    [HttpDelete("{factionInstanceId}/relationships/{relationshipId}")]
    public async Task<IActionResult> RemoveFactionRelationship(Guid campaignId, Guid factionInstanceId, Guid relationshipId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await removeFactionRelationshipCommand.HandleAsync(relationshipId);
        return NoContent();
    }
}