using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/factions")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignFactionsController(
    IGetCampaignFactionInstancesQueryHandler getFactionInstancesQuery,
    IGetPlayerCampaignFactionInstancesQueryHandler getPlayerFactionInstancesQuery,
    IGetPartyCampaignFactionInstancesQueryHandler getPartyFactionInstancesQuery,
    IGetCampaignFactionLibraryQueryHandler factionLibraryQuery,
    IGetCampaignFactionLibraryKeywordCountsQueryHandler factionLibraryKeywordCountsQuery,
    IAddFactionToCampaignCommandHandler addFactionCommand,
    IDeleteFactionInstanceCommandHandler deleteFactionInstanceCommand,
    IUpdateFactionInstanceCommandHandler updateFactionInstanceCommand,
    IUpdateFactionInstanceVisibilityCommandHandler updateFactionInstanceVisibilityCommand,
    IAddFactionCastMemberCommandHandler addFactionCastMemberCommand,
    IRemoveFactionCastMemberCommandHandler removeFactionCastMemberCommand,
    ISetFactionCastMemberPrimaryCommandHandler setFactionCastMemberPrimaryCommand,
    IClearFactionCastMemberPrimaryCommandHandler clearFactionCastMemberPrimaryCommand,
    IAddFactionRelationshipCommandHandler addFactionRelationshipCommand,
    IRemoveFactionRelationshipCommandHandler removeFactionRelationshipCommand,
    ICampaignFactionInstanceWebMapper factionMapper,
    IFactionWebMapper libraryFactionMapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notifications) : ControllerBase
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

    /// <summary>
    /// The campaign's factions as the party's own row reads them: the ones the DM has unlocked to
    /// the party, wearing the party's own cast membership rather than the GM's. Both roles read it —
    /// it is the row a player's own faction panel is drawn from, and the row the GM's party view
    /// puts up to look at what the party has set (see cc-card-faction-navigation) — so it asks only
    /// that the caller is in the campaign, and hands the DM's own notes back empty. The lock is what
    /// puts a faction on this row at all: an unlocked card appears, a locked one leaves.
    /// </summary>
    [HttpGet("party")]
    public async Task<IActionResult> GetPartyFactions(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var instances = await getPartyFactionInstancesQuery.HandleAsync(campaignId);
        return Ok(instances.Select(factionMapper.ToResponse).ToList());
    }

    /// <summary>
    /// One page of the DM's faction library as this campaign can still use it: the factions the
    /// campaign does not hold yet, narrowed by free text (name or type) and/or keywords, paged
    /// server-side so the picker never pulls the whole library down.
    /// </summary>
    [HttpGet("library")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetFactionLibrary(
        Guid campaignId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 35,
        [FromQuery] string searchQuery = "",
        [FromQuery] string keywords = "",
        [FromQuery] string keywordMode = "")
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);

        var page = await factionLibraryQuery.HandleAsync(
            campaignId, dmUserId, BuildLibraryQuery(searchQuery, keywords, keywordMode, pageNumber, pageSize));

        return Ok(new FactionLibraryPageResponse
        {
            Items = page.Items.Select(libraryFactionMapper.ToResponse).ToList(),
            PageNumber = page.PageNumber,
            PageSize = page.PageSize,
            TotalCount = page.TotalCount,
            TotalPages = page.TotalPages,
            LibraryCount = page.LibraryCount,
        });
    }

    /// <summary>
    /// The keywords the factions in that same filter carry, each with its count — the chips the
    /// picker offers over the grid.
    /// </summary>
    [HttpGet("library/keywords")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetFactionLibraryKeywords(
        Guid campaignId,
        [FromQuery] string searchQuery = "",
        [FromQuery] string keywords = "",
        [FromQuery] string keywordMode = "")
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);

        var counts = await factionLibraryKeywordCountsQuery.HandleAsync(
            campaignId, dmUserId, BuildLibraryQuery(searchQuery, keywords, keywordMode, 1, 35));

        return Ok(counts
            .Select(count => new FactionKeywordCountResponse { Keyword = count.Keyword, Count = count.Count })
            .ToList());
    }

    /// <summary>
    /// The picker's filter, as the two library reads both read it: comma-separated keywords and
    /// "all" or "any" (default any) for how they are matched.
    /// </summary>
    private static FactionLibraryQuery BuildLibraryQuery(
        string searchQuery, string keywords, string keywordMode, int pageNumber, int pageSize) =>
        new()
        {
            SearchQuery = searchQuery,
            Keywords = string.IsNullOrWhiteSpace(keywords)
                ? []
                : keywords.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            MatchAll = string.Equals(keywordMode, "all", StringComparison.OrdinalIgnoreCase),
            PageNumber = pageNumber,
            PageSize = pageSize,
        };

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddFaction(Guid campaignId, [FromBody] AddFactionToCampaignRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var dmUserId = userRetriever.GetDmUserId(User);
        var instance = await addFactionCommand.HandleAsync(new AddFactionToCampaignCommand(campaignId, dmUserId, request));
        if (instance is null) return NotFound();

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

        return Ok(factionMapper.ToResponse(instance));
    }

    [HttpDelete("{factionInstanceId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteFaction(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await deleteFactionInstanceCommand.HandleAsync(new DeleteFactionInstanceCommand(campaignId, factionInstanceId));

        await notifications.BroadcastFactionRemovedAsync(campaignId, new
        {
            campaignId = campaignId,
            factionInstanceId = factionInstanceId,
        });

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

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

        // The faction as the campaign now holds it goes out with the event, so a watcher takes the
        // change on from what it is handed rather than reading it back over the API. The id stays on
        // the payload for watchers that only want to know which faction moved.
        var instances = await getFactionInstancesQuery.HandleAsync(campaignId, dmUserId);
        var updated = instances.FirstOrDefault(f => f.FactionInstanceId == factionInstanceId);

        await notifications.BroadcastFactionInstanceUpdatedAsync(campaignId, new
        {
            campaignId,
            factionInstanceId,
            faction = updated is null ? null : factionMapper.ToResponse(updated),
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

        // Broadcast through the notification service rather than the hub context directly: it is
        // the one place that records every send, which is what the Admin's SignalR inspector reads
        // (see AdminSignalRController). The event the clients receive is unchanged.
        await notifications.BroadcastCardVisibilityChangedAsync(campaignId, new CardVisibilityChangedEvent
        {
            CampaignId = campaignId,
            InstanceId = factionInstanceId,
            CardType = "faction",
            IsVisible = request.IsVisibleToPlayers,
        });

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
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> SetFactionCastMemberPrimary(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await setFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, castInstanceId, party: false);
        return NoContent();
    }

    [HttpDelete("{factionInstanceId}/cast/primary")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> ClearFactionCastMemberPrimary(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        await clearFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, party: false);
        return NoContent();
    }

    // ── Faction ↔ Cast membership, the party's own ────────────────────────────
    //
    // The party's memberships and its leader are rows of the same table written with no
    // `dm_user_id`, and they are the party's alone to set: the endpoints below reach only those
    // rows, and only a player's own hand makes them (the GM's row for the same cast stands
    // beside it, untouched, through the endpoints above). The faction row reads them back
    // through `GET party` (see cc-card-faction-navigation).

    /// <summary>
    /// Tells the campaign that the party's own cast cards in a faction have moved — a member added
    /// or taken off, or their crowned leader set or taken off. The faction goes out as the party's
    /// own read now holds it, so a watcher takes the change on from what it is handed rather than
    /// reading it back over the API: that is the GM's look at the party's row, and every player's
    /// own row (see cc-card-faction-navigation). Only the party's side is read and sent — the GM's
    /// memberships are the GM's, and these writes never touched them.
    /// </summary>
    private async Task BroadcastPartyCastChangedAsync(Guid campaignId, Guid factionInstanceId)
    {
        var instances = await getPartyFactionInstancesQuery.HandleAsync(campaignId);
        var updated = instances.FirstOrDefault(f => f.FactionInstanceId == factionInstanceId);

        await notifications.BroadcastFactionPartyCastChangedAsync(campaignId, new
        {
            campaignId,
            factionInstanceId,
            faction = updated is null ? null : factionMapper.ToResponse(updated),
        });
    }

    /// <summary>
    /// A cast card added to a faction by the party: written with no `dm_user_id`, so it lands
    /// beside the GM's own membership rather than in it.
    /// </summary>
    [HttpPost("{factionInstanceId}/party/cast/{castInstanceId}")]
    [Authorize]
    public async Task<IActionResult> AddPartyFactionCastMember(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        // The party's row is every member's own to work, whatever their global role: a DM sitting at
        // another DM's table plays here as a player (see the v2 shell's loadCampaign). Only the
        // campaign's owner is turned away — their own memberships write on the routes above.
        if (await CallerOwns(campaignId)) return Forbid();
        await addFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId, dmUserId: null);
        await BroadcastPartyCastChangedAsync(campaignId, factionInstanceId);
        return NoContent();
    }

    /// <summary>
    /// A cast card taken off a faction by the party: the party's own row alone is broken, so the
    /// GM's membership of the same cast stands.
    /// </summary>
    [HttpDelete("{factionInstanceId}/party/cast/{castInstanceId}")]
    [Authorize]
    public async Task<IActionResult> RemovePartyFactionCastMember(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        if (await CallerOwns(campaignId)) return Forbid();
        await removeFactionCastMemberCommand.HandleAsync(factionInstanceId, castInstanceId, party: true);
        await BroadcastPartyCastChangedAsync(campaignId, factionInstanceId);
        return NoContent();
    }

    /// <summary>The party's leader — the cast card the party has crowned in a faction.</summary>
    [HttpPatch("{factionInstanceId}/party/cast/{castInstanceId}/primary")]
    [Authorize]
    public async Task<IActionResult> SetPartyFactionCastMemberPrimary(Guid campaignId, Guid factionInstanceId, Guid castInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        if (await CallerOwns(campaignId)) return Forbid();
        await setFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, castInstanceId, party: true);
        await BroadcastPartyCastChangedAsync(campaignId, factionInstanceId);
        return NoContent();
    }

    /// <summary>Takes the party's crown off whichever card holds it.</summary>
    [HttpDelete("{factionInstanceId}/party/cast/primary")]
    [Authorize]
    public async Task<IActionResult> ClearPartyFactionCastMemberPrimary(Guid campaignId, Guid factionInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        if (await CallerOwns(campaignId)) return Forbid();
        await clearFactionCastMemberPrimaryCommand.HandleAsync(factionInstanceId, party: true);
        await BroadcastPartyCastChangedAsync(campaignId, factionInstanceId);
        return NoContent();
    }

    // ── Faction Relationships ─────────────────────────────────────────────────

    /// <summary>
    /// Weaves a tie from one faction to another. Whose row it lands in follows whose campaign it
    /// is, not the caller's global role: the owner's ties are written with their id in `gm_user_id`,
    /// and every other hand's are the party's own, written with it null. That is the same split the
    /// cast membership endpoints above keep, so a DM sitting at another's table plays here as a
    /// player (see the v2 shell's loadCampaign) and their ties are the party's. It is also what the
    /// reads lean on: the party's row is drawn from the campaign's rows with no `gm_user_id` (see
    /// CampaignReadRepository), so the collection a player may change is exactly those, and a tie the
    /// GM wove can neither block nor be mistaken for one of theirs.
    /// </summary>
    [HttpPost("{factionInstanceId}/relationships")]
    public async Task<IActionResult> AddFactionRelationship(Guid campaignId, Guid factionInstanceId,
        [FromBody] AddFactionRelationshipRequest request)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        // The owner's hand writes the GM's row; every other hand writes the party's (no `gm_user_id`).
        var gmUserId = await CallerOwns(campaignId) ? userRetriever.GetDmUserId(User) : (Guid?)null;
        var relationship = await addFactionRelationshipCommand.HandleAsync(
            new AddFactionRelationshipCommand(campaignId, gmUserId, request));
        return Ok(new CampaignFactionRelationshipResponse
        {
            Id = relationship.Id,
            CampaignId = relationship.CampaignId,
            FactionInstanceIdA = relationship.FactionInstanceIdA,
            FactionInstanceIdB = relationship.FactionInstanceIdB,
            RelationshipType = relationship.RelationshipType,
            Strength = relationship.Strength,
            CreatedAt = relationship.CreatedAt,
            GmUserId = relationship.GmUserId,
        });
    }

    /// <summary>
    /// Takes back a tie. Only the side that wove it may take it back, told apart on the same
    /// `gm_user_id` the tie was written with (see the add above): the owner works the GM's rows —
    /// those carrying their id — and every other hand the party's, those with none. So a player can
    /// change only the relationships the campaign holds for the party, and the GM only their own.
    /// </summary>
    [HttpDelete("{factionInstanceId}/relationships/{relationshipId}")]
    public async Task<IActionResult> RemoveFactionRelationship(Guid campaignId, Guid factionInstanceId, Guid relationshipId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        // The owner's hand breaks the GM's row; every other hand the party's (no `gm_user_id`).
        await removeFactionRelationshipCommand.HandleAsync(relationshipId, party: !await CallerOwns(campaignId));
        return NoContent();
    }
}