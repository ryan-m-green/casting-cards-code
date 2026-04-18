using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IUpdatePlayerCardCommandHandler
{
    Task<PlayerCardDomain?> HandleAsync(UpdatePlayerCardCommand command);
}

public class UpdatePlayerCardCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardUpdateRepository playerCardUpdateRepository) : IUpdatePlayerCardCommandHandler
{
    public async Task<PlayerCardDomain?> HandleAsync(UpdatePlayerCardCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return null;

        var updatedAt = DateTime.UtcNow;
        await playerCardUpdateRepository.UpdateAsync(command.PlayerCardId, command.Request.Name, command.Request.Race, command.Request.Class, command.Request.Description, updatedAt);

        card.Name = command.Request.Name;
        card.Race = command.Request.Race;
        card.Class = command.Request.Class;
        card.Description = command.Request.Description;
        card.UpdatedAt = updatedAt;
        return card;
    }
}

public class UpdatePlayerCardCommand
{
    public UpdatePlayerCardCommand(Guid playerCardId, Guid playerUserId, UpdatePlayerCardRequest request)
    {
        PlayerCardId = playerCardId;
        PlayerUserId = playerUserId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid PlayerUserId { get; }
    public UpdatePlayerCardRequest Request { get; }
}
