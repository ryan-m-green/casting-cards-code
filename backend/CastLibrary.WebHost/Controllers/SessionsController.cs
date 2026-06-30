using CastLibrary.Logic.Commands.Session;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/sessions")]
[Authorize]
public class SessionsController(
    IStartSessionCommandHandler startSessionCommandHandler,
    IEndSessionCommandHandler endSessionCommandHandler,
    IUpdateSessionCommandHandler updateSessionCommandHandler,
    ISessionReadRepository sessionReadRepository,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveSession(Guid campaignId)
    {
        if (!await CallerOwns(campaignId))
        {
            return Forbid();
        }

        var session = await sessionReadRepository.GetActiveSessionByCampaignIdAsync(campaignId);

        if (session is null)
        {
            return Ok((SessionResponse?)null);
        }

        var response = new SessionResponse
        {
            Id = session.Id,
            CampaignId = session.CampaignId,
            SessionNumber = session.SessionNumber,
            StartTime = session.StartTime,
            StartInGameDay = session.StartInGameDay,
            IsActive = session.IsActive
        };

        return Ok(response);
    }

    [HttpGet("count")]
    public async Task<IActionResult> GetSessionCount(Guid campaignId)
    {
        if (!await CallerOwns(campaignId))
        {
            return Forbid();
        }

        var count = await sessionReadRepository.GetTotalSessionCountAsync(campaignId);
        return Ok(count);
    }

    [HttpPost]
    public async Task<IActionResult> StartSession(Guid campaignId, [FromBody] StartSessionRequest request)
    {
        if (!await CallerOwns(campaignId))
        {
            return Forbid();
        }

        var command = new StartSessionCommand(campaignId, request);
        var domain = await startSessionCommandHandler.HandleAsync(command);

        var response = new SessionResponse
        {
            Id = domain.Id,
            CampaignId = domain.CampaignId,
            SessionNumber = domain.SessionNumber,
            StartTime = domain.StartTime,
            StartInGameDay = domain.StartInGameDay,
            IsActive = domain.IsActive
        };

        return Ok(response);
    }

    [HttpPatch("end")]
    public async Task<IActionResult> EndSession(Guid campaignId, [FromBody] EndSessionRequest request)
    {
        if (!await CallerOwns(campaignId))
        {
            return Forbid();
        }

        var command = new EndSessionCommand(campaignId, request.EndDay, request.AlternateTitle);
        var archivedSessionId = await endSessionCommandHandler.HandleAsync(command);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("SessionEnded", new { campaignId, archivedSessionId });

        return Ok();
    }

    [HttpPatch("{sessionId}")]
    public async Task<IActionResult> UpdateSession(Guid campaignId, Guid sessionId, [FromBody] UpdateSessionRequest request)
    {
        if (!await CallerOwns(campaignId))
        {
            return Forbid();
        }

        var command = new UpdateSessionCommand(sessionId, request);
        var domain = await updateSessionCommandHandler.HandleAsync(command);

        var response = new SessionResponse
        {
            Id = domain.Id,
            CampaignId = domain.CampaignId,
            SessionNumber = domain.SessionNumber,
            StartTime = domain.StartTime,
            StartInGameDay = domain.StartInGameDay,
            IsActive = domain.IsActive
        };

        return Ok(response);
    }
}
