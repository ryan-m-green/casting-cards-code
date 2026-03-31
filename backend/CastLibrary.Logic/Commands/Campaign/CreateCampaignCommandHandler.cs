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
    ICityReadRepository cityReadRepository,
    ICampaignFactory campaignFactory,
    ICityInstanceFactory cityInstanceFactory) : ICreateCampaignCommandHandler
{
    public async Task<CampaignDomain> HandleAsync(CreateCampaignCommand command)
    {
        var campaign = campaignFactory.Create(command.Request, command.DmUserId);
        var saved    = await campaignRepository.InsertAsync(campaign);

        int sortOrder = 0;
        foreach (var cityId in command.Request.CityIds)
        {
            var city = await cityReadRepository.GetByIdAsync(cityId);
            if (city is null) continue;
            var instance = cityInstanceFactory.Create(city, saved.Id, sortOrder++);
            await campaignRepository.InsertCityInstanceAsync(instance);
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
