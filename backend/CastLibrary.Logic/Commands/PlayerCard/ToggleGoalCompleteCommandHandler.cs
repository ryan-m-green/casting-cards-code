using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IToggleGoalCompleteCommandHandler
{
    Task<PlayerCardTraitDomain?> HandleAsync(ToggleGoalCompleteCommand command);
}

public class ToggleGoalCompleteCommandHandler(
    IPlayerCardTraitReadRepository traitReadRepository,
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardTraitUpdateRepository traitUpdateRepository) : IToggleGoalCompleteCommandHandler
{
    public async Task<PlayerCardTraitDomain?> HandleAsync(ToggleGoalCompleteCommand command)
    {
        var trait = await traitReadRepository.GetByIdAsync(command.TraitId);
        if (trait is null || trait.PlayerCardId != command.PlayerCardId) return null;

        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return null;

        var newValue = !trait.IsCompleted;
        await traitUpdateRepository.UpdateCompletedAsync(command.TraitId, newValue);
        trait.IsCompleted = newValue;
        return trait;
    }
}

public class ToggleGoalCompleteCommand
{
    public ToggleGoalCompleteCommand(Guid playerCardId, Guid traitId, Guid playerUserId)
    {
        PlayerCardId = playerCardId;
        TraitId = traitId;
        PlayerUserId = playerUserId;
    }

    public Guid PlayerCardId { get; }
    public Guid TraitId { get; }
    public Guid PlayerUserId { get; }
}
