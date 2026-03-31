using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCastRelationshipCommandHandler
{
    Task<bool> HandleAsync(DeleteCastRelationshipCommand command);
}

public class DeleteCastRelationshipCommandHandler(
    ICampaignCastRelationshipReadRepository readRepository,
    ICampaignCastRelationshipDeleteRepository deleteRepository) : IDeleteCastRelationshipCommandHandler
{
    public async Task<bool> HandleAsync(DeleteCastRelationshipCommand command)
    {
        var existing = await readRepository.GetByIdAsync(command.Id);
        if (existing is null) return false;

        await deleteRepository.DeleteAsync(command.Id);
        return true;
    }
}

public class DeleteCastRelationshipCommand
{
    public DeleteCastRelationshipCommand(Guid id)
    {
        Id = id;
    }
    public Guid Id { get; }
}
