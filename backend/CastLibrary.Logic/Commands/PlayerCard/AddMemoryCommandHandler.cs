using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IAddMemoryCommandHandler
{
    Task<PlayerCardMemoryDomain?> HandleAsync(AddMemoryCommand command);
}

public class AddMemoryCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardMemoryInsertRepository memoryInsertRepository) : IAddMemoryCommandHandler
{
    public async Task<PlayerCardMemoryDomain?> HandleAsync(AddMemoryCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return null;

        var memory = new PlayerCardMemoryDomain
        {
            Id = Guid.NewGuid(),
            PlayerCardId = command.PlayerCardId,
            MemoryType = command.Request.MemoryType,
            SessionNumber = command.Request.SessionNumber,
            Title = command.Request.Title,
            Detail = command.Request.Detail,
            MemoryDate = DateOnly.Parse(command.Request.MemoryDate),
            CreatedAt = DateTime.UtcNow,
        };
        return await memoryInsertRepository.InsertAsync(memory);
    }
}

public class AddMemoryCommand
{
    public AddMemoryCommand(Guid playerCardId, Guid playerUserId, AddMemoryRequest request)
    {
        PlayerCardId = playerCardId;
        PlayerUserId = playerUserId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid PlayerUserId { get; }
    public AddMemoryRequest Request { get; }
}
