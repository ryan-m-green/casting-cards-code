using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/events")]
[Authorize]
public class CampaignEventsController(
    ICreateCampaignEventCommandHandler createCommand,
    IUpdateStorylineVisibilityCommandHandler updateVisibilityCommand,
    IUpdateCampaignEventBodyCommandHandler updateBodyCommand,
    IUpdateCampaignEventDetailsCommandHandler updateDetailsCommand,
    IDeleteCampaignEventCommandHandler deleteEventCommand,
    IReorderCampaignEventsCommandHandler reorderCommand,
    IArchiveCampaignEventsCommandHandler archiveCommand,
    IGetCampaignEventsQueryHandler getEventsQuery,
    IGetVisibleCampaignEventsQueryHandler getVisibleEventsQuery,
    IUploadCampaignEventHandoutCommandHandler uploadHandoutCommand,
    IUploadCampaignEventHandoutImageCommandHandler uploadHandoutImageCommand,
    ICampaignEventWebMapper mapper,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var domains   = await getEventsQuery.HandleAsync(new GetCampaignEventsQuery(campaignId));
        var responses = domains.Select(mapper.ToResponse).ToList();

        return Ok(responses);
    }

    [HttpGet("player")]
    [Authorize(Roles = "Player,DM,Admin")]
    public async Task<IActionResult> GetVisible(Guid campaignId)
    {
        var domains   = await getVisibleEventsQuery.HandleAsync(new GetVisibleCampaignEventsQuery(campaignId));
        var responses = domains.Select(mapper.ToResponse).ToList();

        return Ok(responses);
    }

    [HttpPatch("{eventId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateBody(Guid campaignId, Guid eventId,
        [FromBody] UpdateCampaignEventBodyRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        await updateBodyCommand.HandleAsync(new UpdateCampaignEventBodyCommand(eventId, request));

        // Notify players of event content update
        var events = await getEventsQuery.HandleAsync(new GetCampaignEventsQuery(campaignId));
        var campaignEvent = events.FirstOrDefault(e => e.Id == eventId);
        if (campaignEvent != null)
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync("StorylineEventUpdated", new
                {
                    campaignId,
                    eventId,
                    title = campaignEvent.Title,
                    body = campaignEvent.Body,
                    imageUrl = campaignEvent.ImageUrl
                });
        }

        return NoContent();
    }

    [HttpPatch("{eventId}/details")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateDetails(Guid campaignId, Guid eventId,
        [FromBody] UpdateCampaignEventDetailsRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            return BadRequest("Title is required and must not exceed 200 characters.");

        await updateDetailsCommand.HandleAsync(new UpdateCampaignEventDetailsCommand(eventId, request));

        // Notify players of event content update
        var events = await getEventsQuery.HandleAsync(new GetCampaignEventsQuery(campaignId));
        var campaignEvent = events.FirstOrDefault(e => e.Id == eventId);
        if (campaignEvent != null)
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync("StorylineEventUpdated", new
                {
                    campaignId,
                    eventId,
                    title = campaignEvent.Title,
                    body = campaignEvent.Body,
                    imageUrl = campaignEvent.ImageUrl
                });
        }

        return NoContent();
    }

    [HttpPatch("{eventId}/visibility")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateVisibility(Guid campaignId, Guid eventId,
        [FromBody] UpdateCampaignEventVisibilityRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var resultList = await updateVisibilityCommand.HandleAsync(new UpdateCampaignEventVisibilityCommand(campaignId, eventId, request));

        foreach(var result in resultList)
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync(result.EventName, new CardVisibilityChangedEvent
                {
                    CampaignId = campaignId,
                    InstanceId = result.EntityInstanceId,
                    CardType   = result.CardType,
                    IsVisible  = result.IsVisible,
                    TickCount  = result.TickCount,
                    Title      = result.Title,
                    Body       = result.Body
                });
        }

        return NoContent();
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreateCampaignEventRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var validator = new CreateCampaignEventRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var domain   = await createCommand.HandleAsync(new CreateCampaignEventCommand(campaignId, request));
        var response = mapper.ToResponse(domain);

        return CreatedAtAction(nameof(Create), new { campaignId }, response);
    }

    [HttpPost("handout")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> CreateHandout(Guid campaignId, [FromBody] CreateCampaignEventRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            return BadRequest("Title is required and must not exceed 200 characters.");

        CampaignEventDomain domain;
        if (request.LinkedEntities != null && request.LinkedEntities.Count > 0)
        {
            var firstLinkedEntity = request.LinkedEntities[0];
            domain = await uploadHandoutCommand.HandleAsync(
                new UploadCampaignEventHandoutCommand(campaignId, request.Title.Trim(), request.Body?.Trim(), firstLinkedEntity.EntityType, Guid.Parse(firstLinkedEntity.EntityId)));
        }
        else
        {
            domain = await uploadHandoutCommand.HandleAsync(
                new UploadCampaignEventHandoutCommand(campaignId, request.Title.Trim(), request.Body?.Trim(), null, null));
        }
        var response = mapper.ToResponse(domain);

        return CreatedAtAction(nameof(CreateHandout), new { campaignId }, response);
    }

    [HttpPost("{eventId}/handout-image")]
    [Authorize(Roles = "DM,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadHandoutImage(Guid campaignId, Guid eventId, IFormFile file)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var isAllowed = allowedTypes.Contains(file.ContentType)
            || (file.ContentType == "application/octet-stream" && ext is ".pdf" or ".jpg" or ".jpeg" or ".png" or ".webp");
        if (!isAllowed)
            return BadRequest("Only JPEG, PNG, WebP, and PDF files are supported.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("File size must not exceed 5 MB.");

        var resolvedContentType = file.ContentType == "application/octet-stream" && ext == ".pdf"
            ? "application/pdf"
            : file.ContentType;

        var imageUrl = await uploadHandoutImageCommand.HandleAsync(
            new UploadCampaignEventHandoutImageCommand(campaignId, eventId, file.OpenReadStream(), resolvedContentType));

        return Ok(new { imageUrl });
    }

    [HttpPatch("reorder")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Reorder(Guid campaignId, [FromBody] ReorderCampaignEventsRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        if (request.EventIds is null || request.EventIds.Count == 0)
            return BadRequest("EventIds must not be empty.");

        await reorderCommand.HandleAsync(new ReorderCampaignEventsCommand(request));

        return NoContent();
    }
[HttpPost("archive")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> Archive(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var archivedCount = await archiveCommand.HandleAsync(new ArchiveCampaignEventsCommand(new ArchiveCampaignEventsRequest { CampaignId = campaignId }));

        return Ok(new { archivedCount });
    }

    [HttpDelete("{eventId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteEvent(Guid campaignId, Guid eventId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        await deleteEventCommand.HandleAsync(new DeleteCampaignEventCommand(eventId));

        return NoContent();
    }
}
