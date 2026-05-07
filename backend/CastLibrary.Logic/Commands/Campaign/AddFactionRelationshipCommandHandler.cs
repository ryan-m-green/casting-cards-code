using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddFactionRelationshipCommandHandler
{
    Task<CampaignFactionRelationshipDomain> HandleAsync(AddFactionRelationshipCommand command);
}

public class AddFactionRelationshipCommandHandler(
    ICampaignInsertRepository campaignInsertRepository) : IAddFactionRelationshipCommandHandler
{
    public async Task<CampaignFactionRelationshipDomain> HandleAsync(AddFactionRelationshipCommand command)
    {
        var domain = new CampaignFactionRelationshipDomain
        {
            Id                 = Guid.NewGuid(),
            CampaignId         = command.CampaignId,
            FactionInstanceIdA = command.Request.FactionInstanceIdA,
            FactionInstanceIdB = command.Request.FactionInstanceIdB,
            RelationshipType   = command.Request.RelationshipType,
            Strength           = command.Request.Strength,
            CreatedAt          = DateTime.UtcNow,
            DmUserId           = command.DmUserId,
        };
        return await campaignInsertRepository.InsertFactionRelationshipAsync(domain);
    }
}

public class AddFactionRelationshipCommand
{
    public AddFactionRelationshipCommand(Guid campaignId, Guid dmUserId, AddFactionRelationshipRequest request)
    {
        CampaignId = campaignId;
        DmUserId   = dmUserId;
        Request    = request;
    }
    public Guid CampaignId { get; }
    public Guid DmUserId { get; }
    public AddFactionRelationshipRequest Request { get; }
}
