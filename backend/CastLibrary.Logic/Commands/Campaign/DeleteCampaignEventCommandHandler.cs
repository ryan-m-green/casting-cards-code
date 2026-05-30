using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCampaignEventCommandHandler
{
    Task HandleAsync(DeleteCampaignEventCommand command);
}

public class DeleteCampaignEventCommandHandler(
    ICampaignEventDeleteRepository deleteRepository,
    IStorylineReadRepository readRepository,
    IImageStorageOperator imageStorage) : IDeleteCampaignEventCommandHandler
{
    public async Task HandleAsync(DeleteCampaignEventCommand command)
    {
        var eventToDelete = await readRepository.GetByIdAsync(command.EventId);
        if (eventToDelete != null && !string.IsNullOrWhiteSpace(eventToDelete.FilePath))
        {
            await imageStorage.DeleteAsync(eventToDelete.FilePath);
        }
        await deleteRepository.DeleteAsync(command.EventId);
    }
}

public class DeleteCampaignEventCommand(Guid eventId)
{
    public Guid EventId { get; } = eventId;
}
