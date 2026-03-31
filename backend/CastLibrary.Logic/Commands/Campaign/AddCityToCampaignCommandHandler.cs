using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddCityToCampaignCommandHandler
{
    Task<CampaignCityInstanceDomain> HandleAsync(AddCityToCampaignCommand command);
}
public class AddCityToCampaignCommandHandler(
    ICampaignReadRepository campaignRepository,
    ICampaignInsertRepository campaignInsertRepository,
    ICityReadRepository cityReadRepository,
    ICityInstanceFactory cityInstanceFactory) : IAddCityToCampaignCommandHandler
{
    public async Task<CampaignCityInstanceDomain> HandleAsync(AddCityToCampaignCommand command)
    {
        var city = await cityReadRepository.GetByIdAsync(command.Request.CityId);
        if (city is null) return null;

        var existing  = await campaignRepository.GetCityInstancesByCampaignAsync(command.CampaignId);
        var instance  = cityInstanceFactory.Create(city, command.CampaignId, existing.Count);
        return await campaignInsertRepository.InsertCityInstanceAsync(instance);
    }
}

public class AddCityToCampaignCommand
{
    public AddCityToCampaignCommand(Guid campaignId, AddCityToCampaignRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public AddCityToCampaignRequest Request { get; }
}
