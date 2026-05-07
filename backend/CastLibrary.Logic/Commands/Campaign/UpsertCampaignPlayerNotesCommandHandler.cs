using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpsertCampaignPlayerNotesCommandHandler
{
    Task<CampaignPlayerNotesDomain> HandleAsync(UpsertCampaignPlayerNotesCommand command);
}

public class UpsertCampaignPlayerNotesCommandHandler(
    ICampaignPlayerNotesReadRepository readRepository,
    ICampaignPlayerNotesUpdateRepository updateRepository) : IUpsertCampaignPlayerNotesCommandHandler
{
    public async Task<CampaignPlayerNotesDomain> HandleAsync(UpsertCampaignPlayerNotesCommand command)
    {
        var existing = await readRepository.GetByCampaignAsync(command.CampaignId);
        var domain = new CampaignPlayerNotesDomain
        {
            Id         = existing?.Id ?? Guid.NewGuid(),
            CampaignId = command.CampaignId,
            Notes      = command.Request.Notes,
            CreatedAt  = existing?.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };
        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertCampaignPlayerNotesCommand
{
    public UpsertCampaignPlayerNotesCommand(Guid campaignId, UpsertCampaignPlayerNotesRequest request)
    {
        CampaignId = campaignId;
        Request    = request;
    }

    public Guid CampaignId { get; }
    public UpsertCampaignPlayerNotesRequest Request { get; }
}
