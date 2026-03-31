using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CastLibrary.Logic.Commands.CampaignNote;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Queries.CampaignNote;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.MetadataHelpers;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/notes")]
[Authorize]
public class CampaignNotesController(
    IGetCampaignNotesQueryHandler getNotesQuery,
    IUpsertCampaignNoteCommandHandler upsertNoteCommand,
    IUserRetriever userRetriever) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetNotes(
        Guid campaignId,
        [FromQuery] string entityType,
        [FromQuery] Guid instanceId)
    {
        if (!Enum.TryParse<EntityType>(entityType, true, out var et))
        {
            return BadRequest("Invalid entityType");
        }

        var notes = await getNotesQuery.HandleAsync(campaignId, et, instanceId);
        var response = notes.Select(n => new CampaignNoteResponse
        {
            Id = n.Id,
            CampaignId = n.CampaignId,
            EntityType = n.EntityType.ToString(),
            InstanceId = n.InstanceId,
            Content = n.Content,
            CreatedByDisplayName = n.CreatedByDisplayName,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt,
        }).ToList();

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> AddNote(Guid campaignId, [FromBody] UpsertCampaignNoteRequest request)
    {
        var v = new UpsertCampaignNoteRequestValidator();
        var r = v.Validate(request);
        if (!r.IsValid)
        {
            var errors = r.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var note = await upsertNoteCommand.HandleAsync(new UpsertCampaignNoteCommand(campaignId, request, userRetriever.GetUserId(User)));
        var response = new CampaignNoteResponse
        {
            Id = note.Id,
            CampaignId = note.CampaignId,
            EntityType = note.EntityType.ToString(),
            InstanceId = note.InstanceId,
            Content = note.Content,
            CreatedByDisplayName = note.CreatedByDisplayName,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
        };

        return Ok(response);
    }
}
