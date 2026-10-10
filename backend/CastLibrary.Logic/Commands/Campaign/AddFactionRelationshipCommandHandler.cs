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
        // Validate that a relationship doesn't already exist with the same gm_user_id state
        var exists = await campaignInsertRepository.FactionRelationshipExistsAsync(
            command.CampaignId,
            command.Request.FactionInstanceIdA,
            command.Request.FactionInstanceIdB,
            command.GmUserId);

        if (exists)
        {
            var userType = command.GmUserId.HasValue ? "GM" : "player";
            throw new InvalidOperationException($"A relationship already exists between these factions created by a {userType}.");
        }

        var domain = new CampaignFactionRelationshipDomain
        {
            Id                 = Guid.NewGuid(),
            CampaignId         = command.CampaignId,
            FactionInstanceIdA = command.Request.FactionInstanceIdA,
            FactionInstanceIdB = command.Request.FactionInstanceIdB,
            RelationshipType   = command.Request.RelationshipType,
            Strength           = command.Request.Strength,
            CreatedAt          = DateTime.UtcNow,
            GmUserId           = command.GmUserId,
        };
        return await campaignInsertRepository.InsertFactionRelationshipAsync(domain);
    }
}

public class AddFactionRelationshipCommand
{
    public AddFactionRelationshipCommand(Guid campaignId, Guid? gmUserId, AddFactionRelationshipRequest request)
    {
        CampaignId = campaignId;
        GmUserId   = gmUserId;
        Request    = request;
    }
    public Guid CampaignId { get; }
    public Guid? GmUserId { get; }
    public AddFactionRelationshipRequest Request { get; }
}
