using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Factories;

public interface ICampaignFactory
{
    CampaignDomain Create(CreateCampaignRequest request, Guid dmUserId, bool isCallerAdmin);
}
public class CampaignFactory : ICampaignFactory
{
    public CampaignDomain Create(CreateCampaignRequest request, Guid dmUserId, bool isCallerAdmin) => new()
    {
        Id = Guid.NewGuid(),
        DmUserId = dmUserId,
        Name = request.Name,
        Description = request.Description,
        FantasyType = request.FantasyType,
        Status = CampaignStatus.Active,
        IsDemo = isCallerAdmin ? request.IsDemo : null,
        CreatedAt = DateTime.UtcNow,
    };
}
