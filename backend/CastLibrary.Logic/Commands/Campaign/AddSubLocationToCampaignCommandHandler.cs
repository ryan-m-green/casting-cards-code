using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddSublocationToCampaignCommandHandler
{
    Task<CampaignSublocationInstanceDomain> HandleAsync(AddSublocationToCampaignCommand command);
}
public class AddSublocationToCampaignCommandHandler(
    ICampaignReadRepository campaignRepository,
    ICampaignInsertRepository campaignInsertRepository,
    ISublocationReadRepository sublocationRepository,
    ISublocationInstanceFactory sublocationInstanceFactory) : IAddSublocationToCampaignCommandHandler
{
    public async Task<CampaignSublocationInstanceDomain> HandleAsync(AddSublocationToCampaignCommand command)
    {
        var sublocation = await sublocationRepository.GetByIdAsync(command.Request.SublocationId);
        if (sublocation is null) return null;

        var existing = await campaignRepository.GetSublocationInstanceBySourceSublocationIdAsync(command.CampaignId, command.Request.SublocationId);
        if (existing is not null) return null;

        var instance = sublocationInstanceFactory.Create(sublocation, command.CampaignId, command.Request.CityInstanceId);
        return await campaignInsertRepository.InsertSublocationInstanceAsync(instance);
    }
}

public class AddSublocationToCampaignCommand
{
    public AddSublocationToCampaignCommand(Guid campaignId, AddSublocationToCampaignRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public AddSublocationToCampaignRequest Request { get; }
}
