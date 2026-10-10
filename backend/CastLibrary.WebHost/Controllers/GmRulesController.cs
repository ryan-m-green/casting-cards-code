using System.Security.Claims;
using CastLibrary.Logic.Commands.CampaignRules;
using CastLibrary.Logic.Queries.CampaignRules;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The GM's cheat sheet library. Entries belong to the GM's account and are shared across every
/// campaign they run (a campaign wears them through <c>campaign_rule_links</c>), so this is the
/// journal's Cheat Sheet Library page — the same shape as <see cref="GmConditionsController"/>.
/// </summary>
[ApiController]
[Route("api/rules")]
[Authorize]
public class GmRulesController(
    IGetLibraryRulesQueryHandler libraryQuery,
    ICreateCampaignRuleCommandHandler createCommand,
    IUpdateCampaignRuleCommandHandler updateCommand,
    IDeleteLibraryRuleCommandHandler deleteCommand,
    ICampaignRuleMapper mapper) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rules = await libraryQuery.HandleAsync(CurrentUserId);
        return Ok(rules.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCampaignRuleRequest request)
    {
        var r = new CreateCampaignRuleRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        // No campaign: an entry written from the library stands on its own until a campaign adds it.
        var domain = await createCommand.HandleAsync(
            new CreateCampaignRuleCommand(null, CurrentUserId, request));

        return Ok(mapper.ToResponse(domain));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCampaignRuleRequest request)
    {
        var r = new UpdateCampaignRuleRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await updateCommand.HandleAsync(new UpdateCampaignRuleCommand(id, CurrentUserId, request));
        if (domain is null)
            return NotFound();

        return Ok(mapper.ToResponse(domain));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await deleteCommand.HandleAsync(new DeleteLibraryRuleCommand(id, CurrentUserId));
        if (deleted == 0) return NotFound();

        return NoContent();
    }
}
