using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface ICreatePlayerCardCommandHandler
{
    Task<PlayerCardDomain> HandleAsync(CreatePlayerCardCommand command);
}

public class CreatePlayerCardCommandHandler(
    IPlayerCardInsertRepository playerCardInsertRepository) : ICreatePlayerCardCommandHandler
{
    public async Task<PlayerCardDomain> HandleAsync(CreatePlayerCardCommand command)
    {
        var now = DateTime.UtcNow;
        var card = new PlayerCardDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            PlayerUserId = command.PlayerUserId,
            Name = command.Request.Name,
            Race = command.Request.Race,
            Class = command.Request.Class,
            Description = command.Request.Description,
            CreatedAt = now,
            UpdatedAt = now,
        };
        return await playerCardInsertRepository.InsertAsync(card);
    }
}

public class CreatePlayerCardCommand
{
    public CreatePlayerCardCommand(Guid campaignId, Guid playerUserId, CreatePlayerCardRequest request)
    {
        CampaignId = campaignId;
        PlayerUserId = playerUserId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid PlayerUserId { get; }
    public CreatePlayerCardRequest Request { get; }
}
