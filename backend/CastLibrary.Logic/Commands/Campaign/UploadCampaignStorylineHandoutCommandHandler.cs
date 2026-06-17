using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using DomainLinkedEntityTrigger = CastLibrary.Shared.Domain.LinkedEntityTrigger;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUploadCampaignStorylineHandoutCommandHandler
{
    Task<CampaignEventDomain> HandleAsync(UploadCampaignEventHandoutCommand command);
}

public class UploadCampaignStorylineHandoutCommandHandler(
    ICampaignEventInsertRepository insertRepository) : IUploadCampaignStorylineHandoutCommandHandler
{
    public async Task<CampaignEventDomain> HandleAsync(UploadCampaignEventHandoutCommand command)
    {
        var domain = new CampaignEventDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            Title = command.Title,
            Body = command.Body ?? string.Empty,
            SortOrder = 0,
            LinkedEntities = command.LinkedEntities,
            FilePath = null,
            VisibleToPlayers = false,
            SceneType = "campaign-handout",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await insertRepository.InsertAsync(domain);

        return domain;
    }
}

public class UploadCampaignEventHandoutCommand
{
    public UploadCampaignEventHandoutCommand(Guid campaignId, string title, string body, List<DomainLinkedEntityTrigger> linkedEntities)
    {
        CampaignId       = campaignId;
        Title            = title;
        Body             = body;
        LinkedEntities   = linkedEntities;
    }

    public Guid                        CampaignId     { get; }
    public string                      Title          { get; }
    public string                      Body           { get; }
    public List<DomainLinkedEntityTrigger>   LinkedEntities { get; }
}
