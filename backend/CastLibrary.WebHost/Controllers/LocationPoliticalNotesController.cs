using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/Location-political-notes")]
[Authorize]
public class LocationPoliticalNotesController(
    IGetLocationPoliticalNotesQueryHandler getQuery,
    IUpsertLocationPoliticalNotesCommandHandler upsertCommand,
    ILocationPoliticalNotesMapper politicalNotesMapper) : ControllerBase
{

    [HttpGet("{LocationInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid LocationInstanceId)
    {        
        var domain = await getQuery.HandleAsync(campaignId, LocationInstanceId);
        var response = politicalNotesMapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{LocationInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid LocationInstanceId, [FromBody] UpsertLocationPoliticalNotesRequest request)
    {
        var validator = new UpsertLocationPoliticalNotesRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var domain = await upsertCommand.HandleAsync(new UpsertLocationPoliticalNotesCommand(campaignId, LocationInstanceId, request));
        var response = politicalNotesMapper.ToResponse(domain);

        return Ok(response);
    }
}
