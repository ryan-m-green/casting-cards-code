using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Location;

public interface IUpsertLocationPlayerNotesCommandHandler
{
    Task<CampaignLocationPlayerNotesDomain> HandleAsync(UpsertLocationPlayerNotesCommand command);
}

public class UpsertLocationPlayerNotesCommandHandler(
    ILocationPlayerNotesReadRepository readRepository,
    ILocationPlayerNotesUpdateRepository updateRepository) : IUpsertLocationPlayerNotesCommandHandler
{
    public async Task<CampaignLocationPlayerNotesDomain> HandleAsync(UpsertLocationPlayerNotesCommand command)
    {
        var existing = await readRepository.GetByLocationInstanceAsync(command.CampaignId, command.LocationInstanceId);
        var domain = new CampaignLocationPlayerNotesDomain
        {
            Id                 = existing?.Id ?? Guid.NewGuid(),
            CampaignId         = command.CampaignId,
            LocationInstanceId = command.LocationInstanceId,
            Notes              = command.Request.Notes,
            CreatedAt          = existing?.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt          = DateTime.UtcNow,
        };
        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertLocationPlayerNotesCommand
{
    public UpsertLocationPlayerNotesCommand(Guid campaignId, Guid locationInstanceId, UpsertLocationPlayerNotesRequest request)
    {
        CampaignId         = campaignId;
        LocationInstanceId = locationInstanceId;
        Request            = request;
    }

    public Guid CampaignId { get; }
    public Guid LocationInstanceId { get; }
    public UpsertLocationPlayerNotesRequest Request { get; }
}
