using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/settings")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignSettingsController(
    IGetCampaignInviteCodeQueryHandler getInviteCodeQuery,
    IGenerateCampaignInviteCodeCommandHandler generateInviteCodeCommand,
    IRedeemCampaignInviteCodeCommandHandler redeemInviteCodeCommand,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet("invite-code")]
    public async Task<IActionResult> GetInviteCode(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        
        var code = await getInviteCodeQuery.HandleAsync(campaignId);
        if (code is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToInviteCodeResponse(code);
        return Ok(response);
    }

    [HttpPost("invite-code")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GenerateInviteCode(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var code = await generateInviteCodeCommand.HandleAsync(new GenerateCampaignInviteCodeCommand(campaignId));
        var response = campaignMapper.ToInviteCodeResponse(code);

        return Ok(response);
    }

    [HttpPost("redeem")]
    public async Task<IActionResult> RedeemInviteCode([FromBody] RedeemInviteCodeRequest request)
    {
        var result = await redeemInviteCodeCommand.HandleAsync(
            new RedeemCampaignInviteCodeCommand(userRetriever.GetUserId(User), request));
        if (result is null)
        {
            return BadRequest(new { message = "That code is invalid or has expired. Ask your DM to generate a new one." });
        }

        await hubContext.Clients.Group(result.Campaign.Id.ToString())
            .SendAsync("PlayerJoined", new
            {
                campaignId = result.Campaign.Id,
                player = campaignMapper.ToPlayerResponse(result.Player),
            });

        var response = campaignMapper.ToListResponse(result.Campaign);
        return Ok(response);
    }
}