using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Cast;

public interface IUpsertCastPlayerNotesCommandHandler
{
    Task<CampaignCastPlayerNotesDomain> HandleAsync(UpsertCastPlayerNotesCommand command);
}

public class UpsertCastPlayerNotesCommandHandler(
    ICastPlayerNotesReadRepository readRepository,
    ICastPlayerNotesUpdateRepository updateRepository) : IUpsertCastPlayerNotesCommandHandler
{
    public async Task<CampaignCastPlayerNotesDomain> HandleAsync(UpsertCastPlayerNotesCommand command)
    {
        var existing = await readRepository.GetByCastInstanceAsync(command.CampaignId, command.CastInstanceId);
        var domain = new CampaignCastPlayerNotesDomain
        {
            Id             = existing?.Id ?? Guid.NewGuid(),
            CampaignId     = command.CampaignId,
            CastInstanceId = command.CastInstanceId,
            Want           = command.Request.Want,
            Connections    = command.Request.Connections,
            Alignment      = command.Request.Alignment,
            Perception     = command.Request.Perception,
            Rating         = command.Request.Rating,
            CreatedAt      = existing?.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };
        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertCastPlayerNotesCommand
{
    public UpsertCastPlayerNotesCommand(Guid campaignId, Guid castInstanceId, UpsertCastPlayerNotesRequest request)
    {
        CampaignId = campaignId;
        CastInstanceId = castInstanceId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid CastInstanceId { get; }
    public UpsertCastPlayerNotesRequest Request { get; }
}
