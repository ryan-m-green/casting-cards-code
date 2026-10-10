using CastLibrary.Logic.Commands.Encounter;
using CastLibrary.Logic.Queries.Encounter;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// v2 encounter builder endpoints.
///
/// Groups (encounter spots) are created, renamed and deleted atomically — one
/// call per group, so the builder can assemble a group client side and write it
/// in a single request, and a spot is either fully present or not present at all.
/// The rolled initiative for the whole encounter is committed in one call, which
/// duplicates each spot's number onto all of its combatant rows and rewrites the
/// spot turn order.
///
/// The older CampaignEncountersController keeps the single-combatant, group-move,
/// turn and end-encounter endpoints.
/// </summary>
[ApiController]
[Route("api/campaign/{campaignId}/encounters")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class v2CampaignEncountersController(
    ICreateEncounterSpotCommandHandler createSpotCommand,
    IRenameEncounterSpotCommandHandler renameSpotCommand,
    IDeleteEncounterSpotCommandHandler deleteSpotCommand,
    ISetEncounterInitiativeCommandHandler setInitiativeCommand,
    IRenameEncounterCommandHandler renameEncounterCommand,
    IStartEncounterCommandHandler startEncounterCommand,
    IAssignEncounterCombatantConditionCommandHandler assignConditionCommand,
    IRemoveEncounterCombatantConditionCommandHandler removeConditionCommand,
    IGetEncounterCombatantConditionsQueryHandler getConditionsQuery,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    /// <summary>
    /// Starts the encounter: it becomes the campaign's running encounter and any
    /// other active one is ended. (Ending it again is the older controller's
    /// <c>POST {encounterId}/end</c>.)
    /// </summary>
    [HttpPost("{encounterId}/start")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> StartEncounter(Guid campaignId, Guid encounterId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var encounter = await startEncounterCommand.HandleAsync(new StartEncounterCommand(encounterId));
        if (encounter is null) return NotFound();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return Ok(encounter);
    }

    /// <summary>Renames the encounter itself (its card's title).</summary>
    [HttpPatch("{encounterId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RenameEncounter(Guid campaignId, Guid encounterId,
        [FromBody] RenameEncounterRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var renamed = await renameEncounterCommand.HandleAsync(new RenameEncounterCommand(encounterId, request));
        if (!renamed) return NotFound();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return NoContent();
    }

    /// <summary>Creates a spot and every card in it in one call (the group is atomic).</summary>
    [HttpPost("{encounterId}/spots")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> CreateSpot(Guid campaignId, Guid encounterId, [FromBody] CreateEncounterSpotRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var spot = await createSpotCommand.HandleAsync(new CreateEncounterSpotCommand(encounterId, request));
        if (spot is null) return BadRequest();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return Ok(spot);
    }

    /// <summary>Renames a spot (the server assigns the initial name).</summary>
    [HttpPatch("{encounterId}/spots/{spotId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RenameSpot(Guid campaignId, Guid encounterId, Guid spotId,
        [FromBody] RenameEncounterSpotRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var renamed = await renameSpotCommand.HandleAsync(new RenameEncounterSpotCommand(encounterId, spotId, request));
        if (!renamed) return NotFound();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return NoContent();
    }

    /// <summary>Removes a whole group (its combatants cascade).</summary>
    [HttpDelete("{encounterId}/spots/{spotId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSpot(Guid campaignId, Guid encounterId, Guid spotId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var deleted = await deleteSpotCommand.HandleAsync(new DeleteEncounterSpotCommand(encounterId, spotId));
        if (!deleted) return NotFound();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return NoContent();
    }

    /// <summary>
    /// Commits the rolled initiative for the encounter in one call: every spot's
    /// number lands on all of its combatant rows and the turn order is rewritten.
    /// </summary>
    [HttpPatch("{encounterId}/initiative")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> SetInitiative(Guid campaignId, Guid encounterId,
        [FromBody] SetEncounterInitiativeRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var encounter = await setInitiativeCommand.HandleAsync(new SetEncounterInitiativeCommand(encounterId, request));
        if (encounter is null) return NotFound();

        await notifications.BroadcastEncounterTurnChangedAsync(campaignId,
            new { campaignId, encounterId, currentSpotId = encounter.CurrentSpotId, roundNumber = encounter.RoundNumber });
        return Ok(encounter);
    }

    // ── Conditions on the encounter's cards ────────────────────────────────────────
    // A cast card is the encounter's own row rather than a player card, so the DM's
    // conditions are kept under the card they were given to (a party member's keep to
    // their player card, see CampaignPlayersController). Reading them is what the
    // combatant drawer's conditions tab draws; giving and clearing them is what the
    // DM does while the fight runs.

    /// <summary>The conditions the given card of the encounter carries right now.</summary>
    [HttpGet("{encounterId}/combatants/{combatantId}/conditions")]
    public async Task<IActionResult> GetCombatantConditions(Guid campaignId, Guid encounterId, Guid combatantId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var conditions = await getConditionsQuery.HandleAsync(encounterId, combatantId);
        if (conditions is null) return NotFound();

        return Ok(conditions);
    }

    /// <summary>Gives the card a condition (the standard set and a custom name alike).</summary>
    [HttpPost("{encounterId}/combatants/{combatantId}/conditions")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignCombatantCondition(Guid campaignId, Guid encounterId, Guid combatantId,
        [FromBody] AssignConditionRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var condition = await assignConditionCommand.HandleAsync(
            new AssignEncounterCombatantConditionCommand(encounterId, combatantId, request));
        if (condition is null) return NotFound();

        await notifications.BroadcastToCampaignAsync(campaignId,
            ISignalRNotificationService.EventNames.ConditionAssigned,
            new
            {
                encounterId,
                combatantId,
                conditionId = condition.Id,
                condition.ConditionName,
                condition.AssignedAt,
                tickCount = DateTime.UtcNow.Ticks,
            });

        return Created(string.Empty, condition);
    }

    /// <summary>Takes a condition off the card.</summary>
    [HttpDelete("{encounterId}/combatants/{combatantId}/conditions/{conditionId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveCombatantCondition(Guid campaignId, Guid encounterId, Guid combatantId,
        Guid conditionId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var removed = await removeConditionCommand.HandleAsync(
            new RemoveEncounterCombatantConditionCommand(encounterId, combatantId, conditionId));
        if (!removed) return NotFound();

        await notifications.BroadcastToCampaignAsync(campaignId,
            ISignalRNotificationService.EventNames.ConditionRemoved,
            new
            {
                encounterId,
                combatantId,
                conditionId,
                tickCount = DateTime.UtcNow.Ticks,
            });

        return NoContent();
    }
}
