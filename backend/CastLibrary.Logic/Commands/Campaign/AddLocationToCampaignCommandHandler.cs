using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddLocationToCampaignCommandHandler
{
    Task<CampaignLocationInstanceDomain> HandleAsync(AddLocationToCampaignCommand command);
}
public class AddLocationToCampaignCommandHandler(
    ICampaignReadRepository campaignRepository,
    ICampaignInsertRepository campaignInsertRepository,
    ILocationReadRepository locationReadRepository,
    ILocationInstanceFactory locationInstanceFactory) : IAddLocationToCampaignCommandHandler
{
    public async Task<CampaignLocationInstanceDomain> HandleAsync(AddLocationToCampaignCommand command)
    {
        var location = await locationReadRepository.GetByIdAsync(command.Request.LocationId);
        if (location is null) return null;

        var existing  = await campaignRepository.GetLocationInstancesByCampaignAsync(command.CampaignId);
        var instance  = locationInstanceFactory.Create(location, command.CampaignId, existing.Count);
        return await campaignInsertRepository.InsertLocationInstanceAsync(instance);
    }
}

public class AddLocationToCampaignCommand
{
    public AddLocationToCampaignCommand(Guid campaignId, AddLocationToCampaignRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public AddLocationToCampaignRequest Request { get; }
}



