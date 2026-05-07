using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Faction;

public interface IUpsertFactionPlayerNotesCommandHandler
{
    Task<CampaignFactionPlayerNotesDomain> HandleAsync(UpsertFactionPlayerNotesCommand command);
}

public class UpsertFactionPlayerNotesCommandHandler(
    IFactionPlayerNotesReadRepository readRepository,
    IFactionPlayerNotesUpdateRepository updateRepository) : IUpsertFactionPlayerNotesCommandHandler
{
    public async Task<CampaignFactionPlayerNotesDomain> HandleAsync(UpsertFactionPlayerNotesCommand command)
    {
        var existing = await readRepository.GetByFactionInstanceAsync(command.CampaignId, command.FactionInstanceId);
        var domain = new CampaignFactionPlayerNotesDomain
        {
            Id                = existing?.Id ?? Guid.NewGuid(),
            CampaignId        = command.CampaignId,
            FactionInstanceId = command.FactionInstanceId,
            Notes             = command.Request.Notes,
            Influence         = command.Request.Influence,
            Perception        = command.Request.Perception,
            CreatedAt         = existing?.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow,
        };
        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertFactionPlayerNotesCommand
{
    public UpsertFactionPlayerNotesCommand(Guid campaignId, Guid factionInstanceId, UpsertFactionPlayerNotesRequest request)
    {
        CampaignId        = campaignId;
        FactionInstanceId = factionInstanceId;
        Request           = request;
    }

    public Guid CampaignId { get; }
    public Guid FactionInstanceId { get; }
    public UpsertFactionPlayerNotesRequest Request { get; }
}
