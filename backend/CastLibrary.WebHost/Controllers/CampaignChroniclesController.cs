using CastLibrary.Logic.Commands.CampaignChronicles;
using CastLibrary.Logic.Queries.CampaignChronicles;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/chronicles")]
[Authorize]
public class CampaignChroniclesController(
    IGetChroniclesQueryHandler getChroniclesQuery,
    IGetChroniclesSessionsPagedQueryHandler getChroniclesSessionsPagedQuery,
    IGetChroniclesSessionsQueryHandler getSessionsQuery,
    IUpdateChronicleCommandHandler updateCommand,
    IDeleteSessionCommandHandler deleteSessionCommand,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerIsMemberOrOwner(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    [Authorize(Roles = "Player,DM,Admin")]
    public async Task<IActionResult> GetChronicles(
        Guid campaignId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] string searchQuery = null,
        [FromQuery] string[]? typeFilters = null)
    {
        if (!await CallerIsMemberOrOwner(campaignId)) return Forbid();

        var isPlayer = User.IsInRole("Player") && !User.IsInRole("DM") && !User.IsInRole("Admin");
        
        var response = await getChroniclesQuery.HandleAsync(new GetChroniclesQuery(
            campaignId,
            pageNumber,
            pageSize,
            searchQuery,
            typeFilters,
            isPlayer
        ));

        return Ok(response);
    }

    [HttpGet("sessions")]
    [Authorize(Roles = "Player,DM,Admin")]
    public async Task<IActionResult> GetSessions(Guid campaignId)
    {
        if (!await CallerIsMemberOrOwner(campaignId)) return Forbid();

        var sessions = await getSessionsQuery.HandleAsync(new GetChroniclesSessionsQuery(campaignId));

        return Ok(sessions);
    }

    [HttpGet("sessions-paged")]
    [Authorize(Roles = "Player,DM,Admin")]
    public async Task<IActionResult> GetChroniclesSessionsPaged(
        Guid campaignId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string searchQuery = null,
        [FromQuery] string[]? typeFilters = null)
    {
        if (!await CallerIsMemberOrOwner(campaignId)) return Forbid();

        var isPlayer = User.IsInRole("Player") && !User.IsInRole("DM") && !User.IsInRole("Admin");

        var response = await getChroniclesSessionsPagedQuery.HandleAsync(new GetChroniclesSessionsPagedQuery(
            campaignId,
            pageNumber,
            pageSize,
            searchQuery,
            typeFilters,
            isPlayer
        ));

        return Ok(response);
    }

    [HttpPatch("{chronicleId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateChronicle(
        Guid campaignId,
        Guid chronicleId,
        [FromBody] UpdateChronicleRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            return BadRequest("Title must be between 1 and 200 characters.");

        if (request.Body != null && request.Body.Length > 50000)
            return BadRequest("Body must not exceed 50000 characters.");

        var success = await updateCommand.HandleAsync(new UpdateChronicleCommand(
            campaignId,
            chronicleId,
            request
        ));

        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("sessions/{sessionId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSession(
        Guid campaignId,
        Guid sessionId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var success = await deleteSessionCommand.HandleAsync(new DeleteSessionCommand(campaignId, sessionId));

        if (!success)
            return BadRequest("Cannot delete session with chronicles.");

        await hubContext.Clients.Group(campaignId.ToString()).SendAsync("SessionDeleted", new { sessionId });

        return NoContent();
    }
}
