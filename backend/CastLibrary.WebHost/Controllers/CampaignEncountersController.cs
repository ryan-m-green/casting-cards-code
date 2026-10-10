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

[ApiController]
[Route("api/campaign/{campaignId}/encounters")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignEncountersController(
    IGetCampaignEncountersQueryHandler getEncountersQuery,
    IGetEncounterDetailQueryHandler getEncounterDetailQuery,
    ICreateEncounterCommandHandler createEncounterCommand,
    IAddCombatantToEncounterCommandHandler addCombatantCommand,
    ICreateEncounterGroupCommandHandler createGroupCommand,
    IUpdateEncounterCombatantCommandHandler updateCombatantCommand,
    IRemoveEncounterCombatantCommandHandler removeCombatantCommand,
    IReorderEncounterSpotsCommandHandler reorderSpotsCommand,
    IAdvanceEncounterTurnCommandHandler advanceTurnCommand,
    IEndEncounterCommandHandler endEncounterCommand,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetEncounters(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var encounters = await getEncountersQuery.HandleAsync(campaignId);
        return Ok(encounters);
    }

    [HttpGet("{encounterId}")]
    public async Task<IActionResult> GetEncounter(Guid campaignId, Guid encounterId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var encounter = await getEncounterDetailQuery.HandleAsync(encounterId);
        if (encounter is null || encounter.CampaignId != campaignId) return NotFound();
        return Ok(encounter);
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> CreateEncounter(Guid campaignId, [FromBody] CreateEncounterRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var encounter = await createEncounterCommand.HandleAsync(new CreateEncounterCommand(campaignId, request));
        if (encounter is null) return BadRequest();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId = encounter.Id });
        return Ok(encounter);
    }

    [HttpDelete("{encounterId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteEncounter(Guid campaignId, Guid encounterId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await endEncounterCommand.HandleAsync(new EndEncounterCommand(encounterId));
        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return NoContent();
    }

    [HttpPost("{encounterId}/combatants")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddCombatant(Guid campaignId, Guid encounterId, [FromBody] AddCombatantRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var combatant = await addCombatantCommand.HandleAsync(new AddCombatantToEncounterCommand(encounterId, request));
        if (combatant is null) return BadRequest();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return Ok(combatant);
    }

    [HttpPost("{encounterId}/groups")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> CreateGroup(Guid campaignId, Guid encounterId, [FromBody] CreateGroupRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var spot = await createGroupCommand.HandleAsync(new CreateEncounterGroupCommand(encounterId, request));
        if (spot is null) return BadRequest();

        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return Ok(spot);
    }

    [HttpPatch("{encounterId}/combatants/{combatantId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateCombatant(Guid campaignId, Guid encounterId, Guid combatantId,
        [FromBody] UpdateCombatantRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var combatant = await updateCombatantCommand.HandleAsync(
            new UpdateEncounterCombatantCommand(encounterId, combatantId, request));
        if (combatant is null) return NotFound();

        await notifications.BroadcastEncounterCombatantUpdatedAsync(campaignId,
            new { campaignId, encounterId, combatantId });
        if (request.IsDefeated == true)
        {
            await notifications.BroadcastTrophyAwardedAsync(campaignId, new { campaignId, encounterId, combatantId });
        }

        return Ok(combatant);
    }

    [HttpDelete("{encounterId}/combatants/{combatantId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveCombatant(Guid campaignId, Guid encounterId, Guid combatantId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await removeCombatantCommand.HandleAsync(new RemoveEncounterCombatantCommand(combatantId));
        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return NoContent();
    }

    [HttpPatch("{encounterId}/order")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> ReorderSpots(Guid campaignId, Guid encounterId, [FromBody] ReorderSpotsRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await reorderSpotsCommand.HandleAsync(new ReorderEncounterSpotsCommand(encounterId, request));
        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        return NoContent();
    }

    [HttpPost("{encounterId}/turn")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AdvanceTurn(Guid campaignId, Guid encounterId, [FromBody] AdvanceTurnRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var turn = await advanceTurnCommand.HandleAsync(new AdvanceEncounterTurnCommand(encounterId, request));
        if (turn is null) return NotFound();

        await notifications.BroadcastEncounterTurnChangedAsync(campaignId,
            new { campaignId, encounterId, currentSpotId = turn.CurrentSpotId, roundNumber = turn.RoundNumber });

        if (turn.Ended)
        {
            await notifications.BroadcastEncounterEndedAsync(campaignId, new { campaignId, encounterId, startedAtTicks = DateTime.UtcNow.Ticks });
            await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        }

        return Ok(new { currentSpotId = turn.CurrentSpotId, roundNumber = turn.RoundNumber, ended = turn.Ended });
    }

    [HttpPost("{encounterId}/end")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> EndEncounter(Guid campaignId, Guid encounterId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await endEncounterCommand.HandleAsync(new EndEncounterCommand(encounterId, true));
        await notifications.BroadcastEncounterUpdatedAsync(campaignId, new { campaignId, encounterId });
        await notifications.BroadcastToCampaignAsync(campaignId, "ChronicleAdded", new { campaignId });
        return NoContent();
    }
}
