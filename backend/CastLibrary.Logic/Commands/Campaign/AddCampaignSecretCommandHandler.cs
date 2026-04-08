using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddCampaignSecretCommandHandler
{
    Task<CampaignSecretDomain> HandleAsync(AddCampaignSecretCommand command);
}
public class AddCampaignSecretCommandHandler(ISecretInsertRepository secretInsertRepository) : IAddCampaignSecretCommandHandler
{
    public async Task<CampaignSecretDomain> HandleAsync(AddCampaignSecretCommand command)
    {
        var secret = new CampaignSecretDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            CastInstanceId = command.Request.EntityType == EntityType.Cast ? command.Request.InstanceId : null,
            LocationInstanceId = command.Request.EntityType == EntityType.Location ? command.Request.InstanceId : null,
            SublocationInstanceId = command.Request.EntityType == EntityType.Sublocation ? command.Request.InstanceId : null,
            Content = command.Request.Content,
            SortOrder = 0,
            IsRevealed = false,
            CreatedAt = DateTime.UtcNow,
        };
        return await secretInsertRepository.InsertAsync(secret);
    }
}

public class AddCampaignSecretCommand
{
    public AddCampaignSecretCommand(Guid campaignId, AddCampaignSecretRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public AddCampaignSecretRequest Request { get; }
}

