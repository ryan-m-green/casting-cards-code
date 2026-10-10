using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/field-journal")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class FieldJournalController(
    IGetFieldJournalEntriesQueryHandler getQuery,
    IUpsertFieldJournalEntryCommandHandler upsertCommand,
    IPlayerFieldJournalEntryMapper mapper,
    ISignalRNotificationService notifications,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> Get(Guid campaignId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();

        var entries = await getQuery.HandleAsync(campaignId);
        return Ok(entries.Select(mapper.ToResponse).ToList());
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(Guid campaignId, [FromBody] UpsertPlayerFieldJournalEntryRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        if (request.EncounterId == Guid.Empty) return BadRequest("EncounterId is required.");

        var entry = await upsertCommand.HandleAsync(new UpsertFieldJournalEntryCommand(campaignId, request));

        await notifications.BroadcastFieldJournalUpdatedAsync(campaignId, new
        {
            campaignId,
            encounterId = entry.EncounterId,
            cardKey = entry.CardKey,
            notes = entry.Notes
        });

        return Ok(mapper.ToResponse(entry));
    }
}
