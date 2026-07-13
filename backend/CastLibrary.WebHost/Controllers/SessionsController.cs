using CastLibrary.Logic.Commands.Session;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
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
    ICancelSessionCommandHandler cancelSessionCommandHandler,
    ISessionReadRepository sessionReadRepository,
    ICampaignSessionArchivedReadRepository campaignSessionArchivedReadRepository,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveSession(Guid campaignId)
    {
        if (!await campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User)))
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

    [HttpGet("completed")]
    public async Task<IActionResult> GetCompletedSessions(Guid campaignId)
    {
        if (!await campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User)))
        {
            return Forbid();
        }

        var sessions = await sessionReadRepository.GetCompletedSessionsAsync(campaignId);
        var response = sessions.Select(s => new SessionResponse
        {
            Id = s.Id,
            CampaignId = s.CampaignId,
            SessionNumber = s.SessionNumber,
            StartTime = s.StartTime,
            StartInGameDay = s.StartInGameDay,
            IsActive = s.IsActive
        }).ToList();

        return Ok(response);
    }

    [HttpGet("archived")]
    public async Task<IActionResult> GetArchivedSessions(Guid campaignId)
    {
        if (!await campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User)))
        {
            return Forbid();
        }

        var sessions = await campaignSessionArchivedReadRepository.GetByCampaignIdAsync(campaignId);
        var response = sessions.Select(s => new ArchivedSessionResponse
        {
            Id = s.Id,
            CampaignId = s.CampaignId,
            SessionNumber = s.SessionNumber,
            Title = s.Title,
            AlternateTitle = s.AlternateTitle,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            InGameDays = s.InGameDays,
            ArchivedAt = s.ArchivedAt
        }).ToList();

        return Ok(response);
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

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("SessionStarted", new { 
                campaignId = domain.CampaignId,
                sessionId = domain.Id,
                sessionNumber = domain.SessionNumber,
                startDay = domain.StartInGameDay,
                timestamp = DateTime.UtcNow.Ticks
            });

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
            .SendAsync("SessionEnded", new { campaignId, archivedSessionId, timestamp = DateTime.UtcNow.Ticks });

        return Ok();
    }

    [HttpDelete("cancel")]
    public async Task<IActionResult> CancelSession(Guid campaignId)
    {
        if (!await CallerOwns(campaignId))
        {
            return Forbid();
        }

        var command = new CancelSessionCommand(campaignId);
        await cancelSessionCommandHandler.HandleAsync(command);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("SessionCancelled", new { campaignId, timestamp = DateTime.UtcNow.Ticks });

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
