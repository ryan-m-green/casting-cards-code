using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IAssignConditionCommandHandler
{
    Task<PlayerCardConditionDomain?> HandleAsync(AssignConditionCommand command);
}

public class AssignConditionCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardConditionInsertRepository conditionInsertRepository) : IAssignConditionCommandHandler
{
    public async Task<PlayerCardConditionDomain?> HandleAsync(AssignConditionCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.CampaignId != command.CampaignId) return null;

        var condition = new PlayerCardConditionDomain
        {
            Id = Guid.NewGuid(),
            PlayerCardId = command.PlayerCardId,
            ConditionName = command.Request.ConditionName,
            AssignedAt = DateTime.UtcNow,
        };
        return await conditionInsertRepository.InsertAsync(condition);
    }
}

public class AssignConditionCommand
{
    public AssignConditionCommand(Guid playerCardId, Guid campaignId, AssignConditionRequest request)
    {
        PlayerCardId = playerCardId;
        CampaignId = campaignId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid CampaignId { get; }
    public AssignConditionRequest Request { get; }
}
