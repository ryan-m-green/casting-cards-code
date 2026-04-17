using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IRemoveConditionCommandHandler
{
    Task<bool> HandleAsync(RemoveConditionCommand command);
}

public class RemoveConditionCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardConditionReadRepository conditionReadRepository,
    IPlayerCardConditionDeleteRepository conditionDeleteRepository) : IRemoveConditionCommandHandler
{
    public async Task<bool> HandleAsync(RemoveConditionCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.CampaignId != command.CampaignId) return false;

        var conditions = await conditionReadRepository.GetByPlayerCardAsync(command.PlayerCardId);
        var target = conditions.FirstOrDefault(c => c.Id == command.ConditionId);
        if (target is null) return false;

        await conditionDeleteRepository.DeleteAsync(command.ConditionId);
        return true;
    }
}

public class RemoveConditionCommand
{
    public RemoveConditionCommand(Guid playerCardId, Guid conditionId, Guid campaignId)
    {
        PlayerCardId = playerCardId;
        ConditionId = conditionId;
        CampaignId = campaignId;
    }

    public Guid PlayerCardId { get; }
    public Guid ConditionId { get; }
    public Guid CampaignId { get; }
}
