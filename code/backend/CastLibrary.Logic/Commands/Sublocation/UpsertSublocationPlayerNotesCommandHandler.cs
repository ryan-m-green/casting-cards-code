using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Sublocation;

public interface IUpsertSublocationPlayerNotesCommandHandler
{
    Task<CampaignSublocationPlayerNotesDomain> HandleAsync(UpsertSublocationPlayerNotesCommand command);
}

public class UpsertSublocationPlayerNotesCommandHandler(
    ISublocationPlayerNotesReadRepository readRepository,
    ISublocationPlayerNotesUpdateRepository updateRepository) : IUpsertSublocationPlayerNotesCommandHandler
{
    public async Task<CampaignSublocationPlayerNotesDomain> HandleAsync(UpsertSublocationPlayerNotesCommand command)
    {
        var existing = await readRepository.GetBySublocationInstanceAsync(command.CampaignId, command.SublocationInstanceId);
        var domain = new CampaignSublocationPlayerNotesDomain
        {
            Id                    = existing?.Id ?? Guid.NewGuid(),
            CampaignId            = command.CampaignId,
            SublocationInstanceId = command.SublocationInstanceId,
            Notes                 = command.Request.Notes,
            CreatedAt             = existing?.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt             = DateTime.UtcNow,
        };
        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertSublocationPlayerNotesCommand
{
    public UpsertSublocationPlayerNotesCommand(Guid campaignId, Guid sublocationInstanceId, UpsertSublocationPlayerNotesRequest request)
    {
        CampaignId            = campaignId;
        SublocationInstanceId = sublocationInstanceId;
        Request               = request;
    }

    public Guid CampaignId { get; }
    public Guid SublocationInstanceId { get; }
    public UpsertSublocationPlayerNotesRequest Request { get; }
}
