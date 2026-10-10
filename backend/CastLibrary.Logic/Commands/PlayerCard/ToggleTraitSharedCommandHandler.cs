using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IToggleTraitSharedCommandHandler
{
    Task<PlayerCardTraitDomain> HandleAsync(ToggleTraitSharedCommand command);
}

public class ToggleTraitSharedCommandHandler(
    IPlayerCardTraitReadRepository traitReadRepository,
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardTraitUpdateRepository traitUpdateRepository) : IToggleTraitSharedCommandHandler
{
    public async Task<PlayerCardTraitDomain> HandleAsync(ToggleTraitSharedCommand command)
    {
        var trait = await traitReadRepository.GetByIdAsync(command.TraitId);
        if (trait is null || trait.PlayerCardId != command.PlayerCardId) return null;

        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return null;

        var newValue = !trait.IsShared;
        await traitUpdateRepository.UpdateSharedAsync(command.TraitId, newValue);
        trait.IsShared = newValue;
        return trait;
    }
}

public class ToggleTraitSharedCommand
{
    public ToggleTraitSharedCommand(Guid playerCardId, Guid traitId, Guid playerUserId)
    {
        PlayerCardId = playerCardId;
        TraitId = traitId;
        PlayerUserId = playerUserId;
    }

    public Guid PlayerCardId { get; }
    public Guid TraitId { get; }
    public Guid PlayerUserId { get; }
}
