using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public record DeliverSecretResult(PlayerCardSecretDomain Secret, Guid PlayerUserId);

public interface IDeliverSecretCommandHandler
{
    Task<DeliverSecretResult?> HandleAsync(DeliverSecretCommand command);
}

public class DeliverSecretCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardSecretInsertRepository secretInsertRepository) : IDeliverSecretCommandHandler
{
    public async Task<DeliverSecretResult?> HandleAsync(DeliverSecretCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.CampaignId != command.CampaignId) return null;

        var secret = new PlayerCardSecretDomain
        {
            Id = Guid.NewGuid(),
            PlayerCardId = command.PlayerCardId,
            Content = command.Request.Content,
            IsShared = false,
            CreatedAt = DateTime.UtcNow,
        };

        var inserted = await secretInsertRepository.InsertAsync(secret);
        return new DeliverSecretResult(inserted, card.PlayerUserId);
    }
}

public class DeliverSecretCommand
{
    public DeliverSecretCommand(Guid playerCardId, Guid campaignId, DeliverSecretRequest request)
    {
        PlayerCardId = playerCardId;
        CampaignId = campaignId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid CampaignId { get; }
    public DeliverSecretRequest Request { get; }
}
