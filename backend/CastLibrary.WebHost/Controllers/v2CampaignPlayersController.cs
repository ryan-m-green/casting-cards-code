using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.PlayerCard;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.PlayerCard;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/players")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignPlayersController(
    IGetCampaignPlayersQueryHandler getPlayersQuery,
    IRemoveCampaignPlayerCommandHandler removePlayerCommand,
    IAssignConditionCommandHandler assignCondition,
    IRemoveConditionCommandHandler removeCondition,
    IGetPlayerConditionsQueryHandler getPlayerConditions,
    ICampaignWebMapper mapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notifications) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetPlayers(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var players = await getPlayersQuery.HandleAsync(campaignId);
        var response = players.Select(mapper.ToPlayerResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{playerUserId}")]
    public async Task<IActionResult> GetPlayer(Guid campaignId, Guid playerUserId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var players = await getPlayersQuery.HandleAsync(campaignId, playerUserId);
        if (!players.Any())
        {
            return NotFound();
        }

        var response = mapper.ToPlayerResponse(players.First());
        return Ok(response);
    }

    [HttpDelete("{playerUserId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemovePlayer(Guid campaignId, Guid playerUserId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        await removePlayerCommand.HandleAsync(new RemoveCampaignPlayerCommand(campaignId, playerUserId));

        await notifications.BroadcastToUserAsync(playerUserId, "PlayerRemoved", new { campaignId = campaignId });

        await notifications.BroadcastCampaignNavChangedAsync(campaignId, new { campaignId = campaignId });

        return NoContent();
    }

    // ── Conditions ───────────────────────────────────────────────────────────────
    // A condition belongs to a player's card, so the DM assigns and clears them
    // here. The party is told over the hub, which is what puts a condition on the
    // player's own sheet and on the encounter's combatant panel without a reload.

    /// <summary>
    /// The conditions one party member's card carries right now.
    ///
    /// The rings that sit on a card read them through here after the hub says they changed (see
    /// ConditionAssigned / ConditionRemoved), so a card the DM gives a condition to wears it without
    /// the board being reloaded — the encounter circle's own cards included.
    /// </summary>
    [HttpGet("{playerCardId}/conditions")]
    public async Task<IActionResult> GetConditions(Guid campaignId, Guid playerCardId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var conditions = await getPlayerConditions.HandleAsync(playerCardId);
        return Ok(conditions);
    }

    [HttpPost("{playerCardId}/conditions")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AssignCondition(Guid campaignId, Guid playerCardId, [FromBody] AssignConditionRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var condition = await assignCondition.HandleAsync(new AssignConditionCommand(playerCardId, campaignId, request));
        if (condition is null) return NotFound();

        await notifications.BroadcastConditionAssignedAsync(campaignId, new { playerCardId, conditionId = condition.Id, condition.ConditionName, condition.AssignedAt, tickCount = DateTime.UtcNow.Ticks });

        return Created(string.Empty, condition);
    }

    [HttpDelete("{playerCardId}/conditions/{conditionId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RemoveCondition(Guid campaignId, Guid playerCardId, Guid conditionId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var success = await removeCondition.HandleAsync(new RemoveConditionCommand(playerCardId, conditionId, campaignId));
        if (!success) return NotFound();

        await notifications.BroadcastConditionRemovedAsync(campaignId, new { playerCardId, conditionId, tickCount = DateTime.UtcNow.Ticks });

        return NoContent();
    }
}