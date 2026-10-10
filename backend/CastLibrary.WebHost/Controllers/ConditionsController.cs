using System.Security.Claims;
using CastLibrary.Logic.Commands.Conditions;
using CastLibrary.Logic.Queries.Conditions;
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
[Route("api/campaigns/{campaignId}/conditions")]
[Authorize]
public class ConditionsController(
    IGetConditionsQueryHandler getQuery,
    IGetAvailableConditionsQueryHandler availableQuery,
    ICreateConditionCommandHandler createCommand,
    IUpdateConditionCommandHandler updateCommand,
    ILinkConditionsCommandHandler linkCommand,
    IDeleteConditionCommandHandler deleteCommand,
    IConditionMapper mapper,
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
            .SendAsync("CampaignConditionsChanged", new { campaignId });

    [HttpGet]
    public async Task<IActionResult> GetConditions(Guid campaignId)
    {
        if (!await CallerCanRead(campaignId)) return Forbid();
        var conditions = await getQuery.HandleAsync(campaignId);
        return Ok(conditions.Select(mapper.ToResponse));
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable(Guid campaignId)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var conditions = await availableQuery.HandleAsync(campaignId, CurrentUserId);
        return Ok(conditions.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreateConditionRequest request)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var r = new CreateConditionRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await createCommand.HandleAsync(
            new CreateConditionCommand(campaignId, CurrentUserId, request));

        await Announce(campaignId);

        return Ok(mapper.ToResponse(domain));
    }

    [HttpPost("link")]
    public async Task<IActionResult> Link(Guid campaignId, [FromBody] LinkConditionsRequest request)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var r = new LinkConditionsRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var added = await linkCommand.HandleAsync(
            new LinkConditionsCommand(campaignId, CurrentUserId, request));

        await Announce(campaignId);

        return Ok(new { added });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid campaignId, Guid id, [FromBody] UpdateConditionRequest request)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var r = new UpdateConditionRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await updateCommand.HandleAsync(new UpdateConditionCommand(id, CurrentUserId, request));
        if (domain is null)
            return NotFound();

        await Announce(campaignId);

        return Ok(mapper.ToResponse(domain));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid id)
    {
        if (!await CallerCanEdit(campaignId)) return Forbid();

        var unlinked = await deleteCommand.HandleAsync(
            new DeleteConditionCommand(campaignId, id, CurrentUserId));
        if (unlinked == 0) return NotFound();

        await Announce(campaignId);

        return NoContent();
    }
}
