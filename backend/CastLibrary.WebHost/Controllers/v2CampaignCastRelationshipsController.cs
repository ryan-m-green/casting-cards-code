using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
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
[Route("api/campaign/{campaignId}/castrelationships")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignCastRelationshipsController(
    IGetCastRelationshipsQueryHandler getRelationshipsQuery,
    IGetCastRelationshipByIdQueryHandler getByIdQuery,
    IAddCastRelationshipCommandHandler addCommand,
    IUpdateCastRelationshipCommandHandler updateCommand,
    IDeleteCastRelationshipCommandHandler deleteCommand,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid campaignId, [FromQuery] Guid? sourceCastInstanceId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var relationships = await getRelationshipsQuery.HandleAsync(campaignId, sourceCastInstanceId);
        var response = relationships.Select(campaignMapper.ToRelationshipResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid campaignId, Guid id)
    {
        if (!await CallerCanView(campaignId)) return Forbid();
        var relationship = await getByIdQuery.HandleAsync(id);
        if (relationship is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToRelationshipResponse(relationship);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Add(Guid campaignId, [FromBody] AddCastRelationshipRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var v = new AddCastRelationshipRequestValidator();
        var r = v.Validate(request);
        if (!r.IsValid)
        {
            var errors = r.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var domain = await addCommand.HandleAsync(new AddCastRelationshipCommand(campaignId, request));
        var response = campaignMapper.ToRelationshipResponse(domain);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("RelationshipCreated", new { campaignId = campaignId, relationship = response });

        return CreatedAtAction(nameof(GetById), new { campaignId, id = domain.Id }, response);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Update(Guid campaignId, Guid id,
        [FromBody] UpdateCastRelationshipRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var validator = new UpdateCastRelationshipRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var result = await updateCommand.HandleAsync(new UpdateCastRelationshipCommand(id, request));
        if (result is null)
        {
            return NotFound();
        }

        var response = campaignMapper.ToRelationshipResponse(result);

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("RelationshipUpdated", new { campaignId = campaignId, relationship = response });

        return Ok(response);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid id)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var deleted = await deleteCommand.HandleAsync(new DeleteCastRelationshipCommand(id));
        if (!deleted)
        {
            return NotFound();
        }

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("RelationshipDeleted", new { campaignId = campaignId, relationshipId = id });

        return NoContent();
    }
}