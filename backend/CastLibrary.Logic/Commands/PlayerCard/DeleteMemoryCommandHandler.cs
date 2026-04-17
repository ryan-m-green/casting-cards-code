using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IDeleteMemoryCommandHandler
{
    Task<bool> HandleAsync(DeleteMemoryCommand command);
}

public class DeleteMemoryCommandHandler(
    IPlayerCardMemoryReadRepository memoryReadRepository,
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardMemoryDeleteRepository memoryDeleteRepository) : IDeleteMemoryCommandHandler
{
    public async Task<bool> HandleAsync(DeleteMemoryCommand command)
    {
        var memories = await memoryReadRepository.GetByPlayerCardAsync(command.PlayerCardId);
        var target = memories.FirstOrDefault(m => m.Id == command.MemoryId);
        if (target is null) return false;

        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return false;

        await memoryDeleteRepository.DeleteAsync(command.MemoryId);
        return true;
    }
}

public class DeleteMemoryCommand
{
    public DeleteMemoryCommand(Guid playerCardId, Guid memoryId, Guid playerUserId)
    {
        PlayerCardId = playerCardId;
        MemoryId = memoryId;
        PlayerUserId = playerUserId;
    }

    public Guid PlayerCardId { get; }
    public Guid MemoryId { get; }
    public Guid PlayerUserId { get; }
}
