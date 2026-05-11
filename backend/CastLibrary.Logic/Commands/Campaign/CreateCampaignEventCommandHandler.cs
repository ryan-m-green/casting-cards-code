using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ICreateCampaignEventCommandHandler
{
    Task<CampaignEventDomain> HandleAsync(CreateCampaignEventCommand command);
}

public class CreateCampaignEventCommandHandler(
    ICampaignEventInsertRepository campaignEventRepository) : ICreateCampaignEventCommandHandler
{
    public async Task<CampaignEventDomain> HandleAsync(CreateCampaignEventCommand command)
    {
        var domain = new CampaignEventDomain
        {
            Id               = Guid.NewGuid(),
            CampaignId       = command.CampaignId,
            Title            = command.Request.Title,
            Body             = command.Request.Body,
            SortOrder        = 0,
            LinkedEntityId   = command.Request.LinkedEntityId,
            LinkedEntityType = command.Request.LinkedEntityType,
            TodPositionPercent = command.Request.TodPositionPercent,
            VisibleToPlayers = false,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
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
