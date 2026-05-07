using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.QuicknoteQueue;

public interface ICreateQuicknoteQueueItemCommandHandler
{
    Task<PlayerQuicknoteQueueDomain> HandleAsync(CreateQuicknoteQueueItemCommand command);
}

public class CreateQuicknoteQueueItemCommandHandler(
    IQuicknoteQueueInsertRepository insertRepository) : ICreateQuicknoteQueueItemCommandHandler
{
    public Task<PlayerQuicknoteQueueDomain> HandleAsync(CreateQuicknoteQueueItemCommand command)
    {
        var domain = new PlayerQuicknoteQueueDomain
        {
            Id           = Guid.NewGuid(),
            CampaignId   = command.CampaignId,
            PlayerUserId = command.PlayerUserId,
            Content      = command.Request.Content,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };
        return insertRepository.InsertAsync(domain);
    }
}

public class CreateQuicknoteQueueItemCommand
{
    public CreateQuicknoteQueueItemCommand(Guid campaignId, Guid playerUserId, CreateQuicknoteQueueItemRequest request)
    {
        CampaignId   = campaignId;
        PlayerUserId = playerUserId;
        Request      = request;
    }

    public Guid CampaignId { get; }
    public Guid PlayerUserId { get; }
    public CreateQuicknoteQueueItemRequest Request { get; }
}
