using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddCastRelationshipCommandHandler
{
    Task<CampaignCastRelationshipDomain> HandleAsync(AddCastRelationshipCommand command);
}

public class AddCastRelationshipCommandHandler(
    ICampaignCastRelationshipInsertRepository repository) : IAddCastRelationshipCommandHandler
{
    public async Task<CampaignCastRelationshipDomain> HandleAsync(AddCastRelationshipCommand command)
    {
        var domain = new CampaignCastRelationshipDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            SourceCastInstanceId = command.Request.SourceCastInstanceId,
            TargetCastInstanceId = command.Request.TargetCastInstanceId,
            Value = command.Request.Value,
            Explanation = command.Request.Explanation,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return await repository.InsertAsync(domain);
    }
}

public class AddCastRelationshipCommand
{
    public AddCastRelationshipCommand(Guid campaignId, AddCastRelationshipRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public AddCastRelationshipRequest Request { get; }
}
