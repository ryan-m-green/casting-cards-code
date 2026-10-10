using System.Security.Claims;
using CastLibrary.Logic.Commands.CampaignRules;
using CastLibrary.Logic.Queries.CampaignRules;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/rules")]
[Authorize]
public class CampaignRulesController(
    IGetCampaignRulesQueryHandler getQuery,
    IGetAvailableCampaignRulesQueryHandler availableQuery,
    ICreateCampaignRuleCommandHandler createCommand,
    IUpdateCampaignRuleCommandHandler updateCommand,
    IDeleteCampaignRuleCommandHandler deleteCommand,
    ILinkCampaignRulesCommandHandler linkCommand,
    ICampaignRuleMapper mapper,
    IHubContext<CampaignHub> hubContext,
    ICampaignAccessService campaignAccess) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<bool> CallerCanRead(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, CurrentUserId);

    private Task<bool> CallerCanEdit(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, CurrentUserId);

    private Task Announce(Guid campaignId) =>
        hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("CampaignRulesChanged", new { campaignId });

    [HttpGet]
    public async Task<IActionResult> GetRules(Guid campaignId)
    {
        if (!await CallerCanRead(campaignId)) return Forbid();
        var rules = await getQuery.HandleAsync(campaignId);
        return Ok(rules.Select(mapper.ToResponse));
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable(Guid campaignId)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var rules = await availableQuery.HandleAsync(campaignId, CurrentUserId);
        return Ok(rules.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreateCampaignRuleRequest request)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var r = new CreateCampaignRuleRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await createCommand.HandleAsync(
            new CreateCampaignRuleCommand(campaignId, CurrentUserId, request));

        await Announce(campaignId);

        return Ok(mapper.ToResponse(domain));
    }

    [HttpPost("link")]
    public async Task<IActionResult> Link(Guid campaignId, [FromBody] LinkCampaignRulesRequest request)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var r = new LinkCampaignRulesRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var added = await linkCommand.HandleAsync(
            new LinkCampaignRulesCommand(campaignId, CurrentUserId, request));

        await Announce(campaignId);

        return Ok(new { added });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid campaignId, Guid id, [FromBody] UpdateCampaignRuleRequest request)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var r = new UpdateCampaignRuleRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await updateCommand.HandleAsync(new UpdateCampaignRuleCommand(id, CurrentUserId, request));
        if (domain is null)
            return NotFound();

        await Announce(campaignId);

        return Ok(mapper.ToResponse(domain));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid id)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        await deleteCommand.HandleAsync(new DeleteCampaignRuleCommand(id, campaignId));

        await Announce(campaignId);

        return NoContent();
    }
}
