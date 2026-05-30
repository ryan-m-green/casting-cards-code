using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUploadCampaignEventHandoutCommandHandler
{
    Task<CampaignEventDomain> HandleAsync(UploadCampaignEventHandoutCommand command);
}

public class UploadCampaignEventHandoutCommandHandler(
    ICampaignEventInsertRepository insertRepository) : IUploadCampaignEventHandoutCommandHandler
{
    public async Task<CampaignEventDomain> HandleAsync(UploadCampaignEventHandoutCommand command)
    {
        var eventId = Guid.NewGuid();

        var linkedEntities = new List<LinkedEntityTrigger>();
        if (!string.IsNullOrWhiteSpace(command.LinkedEntityType) && command.LinkedEntityId.HasValue)
        {
            linkedEntities.Add(new LinkedEntityTrigger 
            { 
                EntityType = command.LinkedEntityType, 
                EntityId = command.LinkedEntityId.Value.ToString() 
            });
        }

        var domain = new CampaignEventDomain
        {
            Id = eventId,
            CampaignId = command.CampaignId,
            Title = command.Title,
            Body = command.Body ?? string.Empty,
            SortOrder = 0,
            LinkedEntities = linkedEntities,
            FilePath = null,
            VisibleToPlayers = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await insertRepository.InsertAsync(domain);

        return domain;
    }
}

public class UploadCampaignEventHandoutCommand
{
    public UploadCampaignEventHandoutCommand(Guid campaignId, string title, string body, string linkedEntityType, Guid? linkedEntityId)
    {
        CampaignId       = campaignId;
        Title            = title;
        Body             = body;
        LinkedEntityType = linkedEntityType;
        LinkedEntityId   = linkedEntityId;
    }

    public Guid   CampaignId       { get; }
    public string Title            { get; }
    public string Body             { get; }
    public string LinkedEntityType { get; }
    public Guid?  LinkedEntityId   { get; }
}
