using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastRelationshipCommandHandler
{
    Task<CampaignCastRelationshipDomain> HandleAsync(UpdateCastRelationshipCommand command);
}

public class UpdateCastRelationshipCommandHandler(
    ICampaignCastRelationshipReadRepository readRepository,
    ICampaignCastRelationshipUpdateRepository updateRepository) : IUpdateCastRelationshipCommandHandler
{
    public async Task<CampaignCastRelationshipDomain> HandleAsync(UpdateCastRelationshipCommand command)
    {
        var existing = await readRepository.GetByIdAsync(command.Id);
        if (existing is null) return null;

        existing.Value = command.Request.Value;
        existing.Explanation = command.Request.Explanation;
        existing.UpdatedAt = DateTime.UtcNow;

        await updateRepository.UpdateAsync(existing);
        return existing;
    }
}

public class UpdateCastRelationshipCommand
{
    public UpdateCastRelationshipCommand(Guid id, UpdateCastRelationshipRequest request)
    {
        Id = id;
        Request = request;
    }

    public Guid Id { get; }
    public UpdateCastRelationshipRequest Request { get; }
}
