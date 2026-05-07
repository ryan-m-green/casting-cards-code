using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddFactionToCampaignCommandHandler
{
    Task<CampaignFactionInstanceDomain> HandleAsync(AddFactionToCampaignCommand command);
}

public class AddFactionToCampaignCommandHandler(
    IFactionReadRepository factionReadRepository,
    ICampaignInsertRepository campaignInsertRepository) : IAddFactionToCampaignCommandHandler
{
    public async Task<CampaignFactionInstanceDomain> HandleAsync(AddFactionToCampaignCommand command)
    {
        var faction = await factionReadRepository.GetByIdAsync(command.Request.FactionId);
        if (faction is null) return null;

        var instance = new CampaignFactionInstanceDomain
        {
            FactionInstanceId  = Guid.NewGuid(),
            SourceFactionId    = faction.FactionId,
            CampaignId         = command.CampaignId,
            DmUserId           = command.DmUserId,
            Name               = faction.Name,
            Type               = faction.Type,
            Influence          = faction.Influence,
            Hidden             = faction.Hidden,
            IsVisibleToPlayers = false,
            Description        = faction.Description,
            DmNotes            = faction.DmNotes,
            SymbolPath         = faction.SymbolPath,
            CreatedAt          = DateTime.UtcNow,
        };

        return await campaignInsertRepository.InsertFactionInstanceAsync(instance);
    }
}

public class AddFactionToCampaignCommand
{
    public AddFactionToCampaignCommand(Guid campaignId, Guid dmUserId, AddFactionToCampaignRequest request)
    {
        CampaignId = campaignId;
        DmUserId   = dmUserId;
        Request    = request;
    }
    public Guid CampaignId { get; }
    public Guid DmUserId { get; }
    public AddFactionToCampaignRequest Request { get; }
}
