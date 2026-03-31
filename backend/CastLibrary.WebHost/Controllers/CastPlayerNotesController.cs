using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/cast-player-notes")]
[Authorize]
public class CastPlayerNotesController(
    IGetCastPlayerNotesQueryHandler getQuery,
    IUpsertCastPlayerNotesCommandHandler upsertCommand,
    ICampaignCastPlayerNotesMapper mapper) : ControllerBase
{

    [HttpGet("by-cast-instances")]
    public async Task<IActionResult> GetByCastInstances(Guid campaignId, [FromQuery] List<Guid> castInstanceId)
    {
        var domains = await getQuery.HandleByCastInstancesAsync(campaignId, castInstanceId);
        var response = domains.Select(o => mapper.ToResponse(o)).ToList();

        return Ok(response);
    }

    [HttpGet("{castInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid castInstanceId)
    {
        var domain = await getQuery.HandleAsync(campaignId, castInstanceId);
        var response = mapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{castInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid castInstanceId, [FromBody] UpsertCastPlayerNotesRequest request)
    {
        var validator = new UpsertCastPlayerNotesRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var domain = await upsertCommand.HandleAsync(new UpsertCastPlayerNotesCommand(campaignId, castInstanceId, request));
        var response = mapper.ToResponse(domain);

        return Ok(response);
    }

}
