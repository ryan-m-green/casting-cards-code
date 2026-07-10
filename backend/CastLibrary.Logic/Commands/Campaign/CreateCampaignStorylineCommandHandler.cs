using CastLibrary.Repository.Mappers;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ICreateCampaignStorylineCommandHandler
{
    Task<CampaignStorylineDomain> HandleAsync(CreateCampaignEventCommand command);
}

public class CreateCampaignStorylineCommandHandler(
    ICampaignEventInsertRepository campaignEventRepository) : ICreateCampaignStorylineCommandHandler
{
    public async Task<CampaignStorylineDomain> HandleAsync(CreateCampaignEventCommand command)
    {
        var domain = new CampaignStorylineDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            Title = command.Request.Title,
            Body = command.Request.Body,
            SortOrder = 0,
            LinkedEntities = command.Request.LinkedEntities,
            VisibleToPlayers = command.Request.IsVisibleToPlayers,
            SceneType = "campaign-event",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return await campaignEventRepository.InsertAsync(domain);
    }
}

public class CreateCampaignEventCommand
{
    public CreateCampaignEventCommand(Guid campaignId, CreateCampaignEventRequest request)
    {
        CampaignId = campaignId;
        Request    = request;
    }

    public Guid CampaignId { get; }
    public CreateCampaignEventRequest Request { get; }
}
