using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ICreateCampaignCommandHandler
{
    Task<CampaignDomain> HandleAsync(CreateCampaignCommand command);
}
public class CreateCampaignCommandHandler(
    ICampaignInsertRepository campaignRepository,
    ILocationReadRepository locationReadRepository,
    ICampaignFactory campaignFactory,
    ILocationInstanceFactory locationInstanceFactory) : ICreateCampaignCommandHandler
{
    public async Task<CampaignDomain> HandleAsync(CreateCampaignCommand command)
    {
        var campaign = campaignFactory.Create(command.Request, command.DmUserId);
        var saved    = await campaignRepository.InsertAsync(campaign);

        int sortOrder = 0;
        foreach (var LocationId in command.Request.LocationIds)
        {
            var location = await locationReadRepository.GetByIdAsync(LocationId);
            if (location is null) continue;
            var instance = locationInstanceFactory.Create(location, saved.Id, sortOrder++);
            await campaignRepository.InsertLocationInstanceAsync(instance);
        }

        return saved;
    }
}

public class CreateCampaignCommand
{
    public CreateCampaignCommand(Guid dmUserId, CreateCampaignRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateCampaignRequest Request { get; }
}


