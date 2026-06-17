using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCampaignEventDetailsCommandHandler
{
    Task HandleAsync(UpdateCampaignEventDetailsCommand command);
}

public class UpdateCampaignEventDetailsCommandHandler(
    IStorylineUpdateRepository repository,
    IStorylineReadRepository readRepository,
    IImageStorageOperator imageStorage) : IUpdateCampaignEventDetailsCommandHandler
{
    public async Task HandleAsync(UpdateCampaignEventDetailsCommand command)
    {
        var linkedEntities = CampaignEventEntityMapper.ToJson(command.Request.LinkedEntities);
        
        // Get current event to check for file cleanup
        var currentEvent = await readRepository.GetByIdAsync(command.EventId);
        
        string filePath = currentEvent?.FilePath ?? string.Empty;
        
        // If switching from campaign-handout to campaign-event, delete the file
        if (currentEvent?.SceneType == "campaign-handout" && command.Request.SceneType == "campaign-event" && !string.IsNullOrEmpty(currentEvent.FilePath))
        {
            await imageStorage.DeleteAsync(currentEvent.FilePath);
            filePath = string.Empty;
        }
        
        await repository.UpdateDetailsAsync(
            command.EventId,
            command.Request.Title.Trim(),
            command.Request.Body,
            command.Request.SceneType,
            filePath,
            linkedEntities);
    }
}

public class UpdateCampaignEventDetailsCommand
{
    public UpdateCampaignEventDetailsCommand(Guid eventId, UpdateCampaignEventDetailsRequest request)
    {
        EventId = eventId;
        Request = request;
    }

    public Guid EventId { get; }
    public UpdateCampaignEventDetailsRequest Request { get; }
}
