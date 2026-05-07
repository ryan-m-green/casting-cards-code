using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.QuicknoteQueue;

public interface IUpdateQuicknoteQueueItemCommandHandler
{
    Task<PlayerQuicknoteQueueDomain> HandleAsync(UpdateQuicknoteQueueItemCommand command);
}

public class UpdateQuicknoteQueueItemCommandHandler(
    IQuicknoteQueueReadRepository readRepository,
    IQuicknoteQueueUpdateRepository updateRepository) : IUpdateQuicknoteQueueItemCommandHandler
{
    public async Task<PlayerQuicknoteQueueDomain> HandleAsync(UpdateQuicknoteQueueItemCommand command)
    {
        var existing = await readRepository.GetByIdAsync(command.Id, command.PlayerUserId);
        if (existing is null)
            return null;

        existing.Content   = command.Request.Content;
        existing.UpdatedAt = DateTime.UtcNow;

        return await updateRepository.UpdateAsync(existing);
    }
}

public class UpdateQuicknoteQueueItemCommand
{
    public UpdateQuicknoteQueueItemCommand(Guid id, Guid campaignId, Guid playerUserId, UpdateQuicknoteQueueItemRequest request)
    {
        Id           = id;
        CampaignId   = campaignId;
        PlayerUserId = playerUserId;
        Request      = request;
    }

    public Guid Id { get; }
    public Guid CampaignId { get; }
    public Guid PlayerUserId { get; }
    public UpdateQuicknoteQueueItemRequest Request { get; }
}
