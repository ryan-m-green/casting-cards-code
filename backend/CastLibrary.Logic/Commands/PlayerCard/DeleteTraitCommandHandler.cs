using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IDeleteTraitCommandHandler
{
    Task<bool> HandleAsync(DeleteTraitCommand command);
}

public class DeleteTraitCommandHandler(
    IPlayerCardTraitReadRepository traitReadRepository,
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardTraitDeleteRepository traitDeleteRepository) : IDeleteTraitCommandHandler
{
    public async Task<bool> HandleAsync(DeleteTraitCommand command)
    {
        var trait = await traitReadRepository.GetByIdAsync(command.TraitId);
        if (trait is null || trait.PlayerCardId != command.PlayerCardId) return false;

        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return false;

        await traitDeleteRepository.DeleteAsync(command.TraitId);
        return true;
    }
}

public class DeleteTraitCommand
{
    public DeleteTraitCommand(Guid playerCardId, Guid traitId, Guid playerUserId)
    {
        PlayerCardId = playerCardId;
        TraitId = traitId;
        PlayerUserId = playerUserId;
    }

    public Guid PlayerCardId { get; }
    public Guid TraitId { get; }
    public Guid PlayerUserId { get; }
}
