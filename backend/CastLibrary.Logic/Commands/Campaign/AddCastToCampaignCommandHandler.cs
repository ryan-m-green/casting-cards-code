using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddCastToCampaignCommandHandler
{
    Task<CampaignCastInstanceDomain> HandleAsync(AddCastToCampaignCommand command);
}
public class AddCastToCampaignCommandHandler(
    ICampaignReadRepository campaignRepository,
    ICampaignInsertRepository campaignInsertRepository,
    ICastReadRepository castRepository,
    ICastInstanceFactory castInstanceFactory) : IAddCastToCampaignCommandHandler
{
    public async Task<CampaignCastInstanceDomain> HandleAsync(AddCastToCampaignCommand command)
    {
        var cast = await castRepository.GetByIdAsync(command.Request.CastId);
        if (cast is null) return null;

        var existing = await campaignRepository.GetCastInstanceBySourceCastIdAsync(command.CampaignId, command.Request.CastId);
        if (existing is not null) return null;

        var instance = castInstanceFactory.Create(cast, command.CampaignId, command.Request.CityInstanceId, command.Request.LocationInstanceId);
        return await campaignInsertRepository.InsertCastInstanceAsync(instance);
    }
}

public class AddCastToCampaignCommand
{
    public AddCastToCampaignCommand(Guid campaignId, AddCastToCampaignRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public AddCastToCampaignRequest Request { get; }
}
