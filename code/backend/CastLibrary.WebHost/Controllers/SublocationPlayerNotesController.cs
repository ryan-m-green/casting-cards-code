using CastLibrary.Logic.Commands.Sublocation;
using CastLibrary.Logic.Queries.Sublocation;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/sublocation-player-notes")]
[Authorize]
public class SublocationPlayerNotesController(
    IGetSublocationPlayerNotesQueryHandler getQuery,
    IUpsertSublocationPlayerNotesCommandHandler upsertCommand,
    ICampaignSublocationPlayerNotesMapper mapper) : ControllerBase
{
    [HttpGet("{sublocationInstanceId}")]
    public async Task<IActionResult> Get(Guid campaignId, Guid sublocationInstanceId)
    {
        var domain = await getQuery.HandleAsync(campaignId, sublocationInstanceId);
        var response = domain is null
            ? mapper.ToEmpty(campaignId, sublocationInstanceId)
            : mapper.ToResponse(domain);

        return Ok(response);
    }

    [HttpPut("{sublocationInstanceId}")]
    public async Task<IActionResult> Upsert(
        Guid campaignId, Guid sublocationInstanceId, [FromBody] UpsertSublocationPlayerNotesRequest request)
    {
        var domain = await upsertCommand.HandleAsync(
            new UpsertSublocationPlayerNotesCommand(campaignId, sublocationInstanceId, request));
        var response = mapper.ToResponse(domain);

        return Ok(response);
    }
}
