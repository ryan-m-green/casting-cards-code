using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Strategies;
using CastLibrary.Logic.Validators;
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
    ICreateCampaignStorylineCommandHandler createCommand,
    IUpdateStorylineVisibilityCommandHandler updateVisibilityCommand,
    IUpdateStorylineArchiveMarkCommandHandler updateArchiveMarkCommand,
    IUpdateCampaignEventBodyCommandHandler updateBodyCommand,
    IUpdateCampaignEventDetailsCommandHandler updateDetailsCommand,
    IDeleteCampaignEventCommandHandler deleteEventCommand,
    IReorderCampaignEventsCommandHandler reorderCommand,
    IGetCampaignStorylineItemsQueryHandler getEventsQuery,
    IGetVisibleCampaignEventsQueryHandler getVisibleEventsQuery,
    IUploadCampaignStorylineHandoutCommandHandler uploadHandoutCommand,
    IUploadCampaignEventHandoutImageCommandHandler uploadHandoutImageCommand,
    ICampaignEventWebMapper mapper,
    ICampaignAccessService campaignAccess,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext,
    IFileValidationService fileValidationService) : ControllerBase
{
    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var domains   = await getEventsQuery.HandleAsync(new GetCampaignStorylineItemsQuery(campaignId));
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
        var events = await getEventsQuery.HandleAsync(new GetCampaignStorylineItemsQuery(campaignId));
        var campaignEvent = events.FirstOrDefault(e => e.Id == eventId);
        if (campaignEvent != null)
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync("StorylineEventUpdated", new
                {
                    campaignId,
                    eventId,
                    sceneType = campaignEvent.SceneType,
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
        var events = await getEventsQuery.HandleAsync(new GetCampaignStorylineItemsQuery(campaignId));
        var campaignEvent = events.FirstOrDefault(e => e.Id == eventId);
        if (campaignEvent != null)
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync("StorylineEventUpdated", new
                {
                    campaignId,
                    eventId,
                    sceneType = campaignEvent.SceneType,
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
            object responseObject = null;
            if (result.CardType == EntityTypes.TimeOfDay)
            {
                responseObject = new { campaignId = result.CampaignId, positionPercent = result.PositionPercentMoved };
            }
            else
            {
                responseObject = new CardVisibilityChangedEvent
                {
                    CampaignId = campaignId,
                    InstanceId = result.EntityInstanceId,
                    CardType = result.CardType,
                    IsVisible = result.IsVisible,
                    TickCount = result.TickCount,
                    Title = result.Title,
                    Body = result.Body,
                    PlayerCardName = result.PlayerCardName,
                    PlayerCardRace = result.PlayerCardRace,
                    PlayerCardClass = result.PlayerCardClass,
                    PlayerCardImageUrl = result.PlayerCardImageUrl
                };
            }

            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync(result.EventName, responseObject);
        }

        return NoContent();
    }

    [HttpPatch("{eventId}/archive-mark")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateArchiveMark(Guid campaignId, Guid eventId,
        [FromBody] bool markedForArchive)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        await updateArchiveMarkCommand.HandleAsync(new UpdateStorylineArchiveMarkCommand(eventId, markedForArchive));

        // SignalR event for real-time update
        await hubContext.Clients.Group(campaignId.ToString())
            .SendAsync("CampaignEventArchiveMarkChanged", new
            {
                campaignId,
                eventId,
                markedForArchive
            });

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

        var domain = await uploadHandoutCommand.HandleAsync(
            new UploadCampaignEventHandoutCommand(campaignId, request.Title.Trim(), request.Body?.Trim(), request.LinkedEntities ?? []));

        var response = mapper.ToResponse(domain);

        return CreatedAtAction(nameof(CreateHandout), new { campaignId }, response);
    }

    [HttpPost("{eventId}/handout-image")]
    [Authorize(Roles = "DM,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadHandoutImage(Guid campaignId, Guid eventId, IFormFile file)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        var validationResult = await fileValidationService.ValidateFileAsync(file, 20 * 1024 * 1024, 
            new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);

        var resolvedContentType = validationResult.DetectedContentType;

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

    [HttpDelete("{eventId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteEvent(Guid campaignId, Guid eventId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();

        await deleteEventCommand.HandleAsync(new DeleteCampaignEventCommand(eventId));

        return NoContent();
    }
}
