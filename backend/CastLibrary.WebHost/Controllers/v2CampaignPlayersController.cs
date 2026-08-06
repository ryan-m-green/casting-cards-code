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
[Route("api/campaign/{campaignId}/players")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignPlayersController(
    IGetCampaignPlayersQueryHandler getPlayersQuery,
    IRemoveCampaignPlayerCommandHandler removePlayerCommand,
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

        await hubContext.Clients.User(playerUserId.ToString())
            .SendAsync("PlayerRemoved", new { campaignId = campaignId });

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("CampaignNavChanged", new { campaignId = campaignId });

        return NoContent();
    }
}