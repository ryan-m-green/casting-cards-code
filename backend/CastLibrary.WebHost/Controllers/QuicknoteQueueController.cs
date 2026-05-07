using System.Security.Claims;
using CastLibrary.Logic.Commands.QuicknoteQueue;
using CastLibrary.Logic.Queries.QuicknoteQueue;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/quicknote-queue")]
[Authorize]
public class QuicknoteQueueController(
    IGetQuicknoteQueueQueryHandler getQuery,
    ICreateQuicknoteQueueItemCommandHandler createCommand,
    IUpdateQuicknoteQueueItemCommandHandler updateCommand,
    IDeleteQuicknoteQueueItemCommandHandler deleteCommand,
    IPlayerQuicknoteQueueMapper mapper,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetQueue(Guid campaignId)
    {
        var items = await getQuery.HandleAsync(campaignId, CurrentUserId);
        return Ok(items.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreateQuicknoteQueueItemRequest request)
    {
        var v = new CreateQuicknoteQueueItemRequestValidator();
        var r = v.Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await createCommand.HandleAsync(
            new CreateQuicknoteQueueItemCommand(campaignId, CurrentUserId, request));

        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("QuickNoteQueued", new { campaignId });

        return Ok(mapper.ToResponse(domain));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid campaignId, Guid id, [FromBody] UpdateQuicknoteQueueItemRequest request)
    {
        var v = new UpdateQuicknoteQueueItemRequestValidator();
        var r = v.Validate(request);
        if (!r.IsValid)
            return BadRequest(r.Errors.Select(e => e.ErrorMessage));

        var domain = await updateCommand.HandleAsync(
            new UpdateQuicknoteQueueItemCommand(id, campaignId, CurrentUserId, request));
        if (domain is null)
            return NotFound();

        return Ok(mapper.ToResponse(domain));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid id)
    {
        await deleteCommand.HandleAsync(new DeleteQuicknoteQueueItemCommand(id, CurrentUserId));
        return NoContent();
    }
}
