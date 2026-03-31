using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignNote;

public interface IUpsertCampaignNoteCommandHandler
{
    Task<CampaignNoteDomain> HandleAsync(UpsertCampaignNoteCommand command);
}
public class UpsertCampaignNoteCommandHandler(
    INoteUpdateRepository noteUpdateRepository,
    IUserReadRepository userReadRepository) : IUpsertCampaignNoteCommandHandler
{
    public async Task<CampaignNoteDomain> HandleAsync(UpsertCampaignNoteCommand command)
    {
        var user = await userReadRepository.GetByIdAsync(command.UserId);
        var note = new CampaignNoteDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            EntityType = command.Request.EntityType,
            InstanceId = command.Request.InstanceId,
            Content = command.Request.Content,
            CreatedByUserId = command.UserId,
            CreatedByDisplayName = user?.DisplayName ?? "Unknown",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        return await noteUpdateRepository.UpsertAsync(note);
    }
}

public class UpsertCampaignNoteCommand
{
    public UpsertCampaignNoteCommand(Guid campaignId, UpsertCampaignNoteRequest request, Guid userId)
    {
        CampaignId = campaignId;
        Request = request;
        UserId = userId;
    }

    public Guid CampaignId { get; }
    public UpsertCampaignNoteRequest Request { get; }
    public Guid UserId { get; }
}
