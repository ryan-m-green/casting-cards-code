using CastLibrary.Logic.Commands.City;
using CastLibrary.Logic.Queries.City;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/city-political-notes")]
[Authorize]
public class CityPoliticalNotesController(
    IGetCityPoliticalNotesQueryHandler getQuery,
    IUpsertCityPoliticalNotesCommandHandler upsertCommand,
    ICityPoliticalNotesMapper politicalNotesMapper) : ControllerBase
{

    [HttpGet("{cityInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid cityInstanceId)
    {        
        var domain = await getQuery.HandleAsync(campaignId, cityInstanceId);
        var response = politicalNotesMapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{cityInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid cityInstanceId, [FromBody] UpsertCityPoliticalNotesRequest request)
    {
        var validator = new UpsertCityPoliticalNotesRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var domain = await upsertCommand.HandleAsync(new UpsertCityPoliticalNotesCommand(campaignId, cityInstanceId, request));
        var response = politicalNotesMapper.ToResponse(domain);

        return Ok(response);
    }
}