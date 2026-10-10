using System.Security.Claims;
using CastLibrary.Logic.Commands.Conditions;
using CastLibrary.Logic.Queries.Conditions;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The GM's condition library. Conditions belong to the GM's account and are shared across
/// every campaign the GM runs, so this is the journal's Conditions Library page.
/// </summary>
[ApiController]
[Route("api/conditions")]
[Authorize]
public class GmConditionsController(
    IGetLibraryConditionsQueryHandler libraryQuery,
    ICreateConditionCommandHandler createCommand,
    IUpdateConditionCommandHandler updateCommand,
    IDeleteLibraryConditionCommandHandler deleteCommand,
    IConditionMapper mapper) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var conditions = await libraryQuery.HandleAsync(CurrentUserId);
        return Ok(conditions.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateConditionRequest request)
    {
        var r = new CreateConditionRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await createCommand.HandleAsync(
            new CreateConditionCommand(null, CurrentUserId, request));

        return Ok(mapper.ToResponse(domain));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateConditionRequest request)
    {
        var r = new UpdateConditionRequestValidator().Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await updateCommand.HandleAsync(new UpdateConditionCommand(id, CurrentUserId, request));
        if (domain is null)
            return NotFound();

        return Ok(mapper.ToResponse(domain));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await deleteCommand.HandleAsync(new DeleteLibraryConditionCommand(id, CurrentUserId));
        if (deleted == 0) return NotFound();

        return NoContent();
    }
}