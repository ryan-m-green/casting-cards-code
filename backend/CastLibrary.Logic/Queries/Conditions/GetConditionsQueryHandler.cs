using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Conditions;

public interface IGetConditionsQueryHandler
{
    Task<List<ConditionDomain>> HandleAsync(Guid campaignId);
}

public class GetConditionsQueryHandler(
    IConditionReadRepository readRepository) : IGetConditionsQueryHandler
{
    public Task<List<ConditionDomain>> HandleAsync(Guid campaignId)
        => readRepository.GetByCampaignAsync(campaignId);
}

public interface IGetAvailableConditionsQueryHandler
{
    Task<List<ConditionDomain>> HandleAsync(Guid campaignId, Guid gmUserId);
}

public class GetAvailableConditionsQueryHandler(
    IConditionReadRepository readRepository) : IGetAvailableConditionsQueryHandler
{
    public Task<List<ConditionDomain>> HandleAsync(Guid campaignId, Guid gmUserId)
        => readRepository.GetAvailableAsync(campaignId, gmUserId);
}

public interface IGetLibraryConditionsQueryHandler
{
    Task<List<ConditionDomain>> HandleAsync(Guid gmUserId);
}

/// <summary>Every condition the GM owns — the Conditions Library page's shelf.</summary>
public class GetLibraryConditionsQueryHandler(
    IConditionReadRepository readRepository) : IGetLibraryConditionsQueryHandler
{
    public Task<List<ConditionDomain>> HandleAsync(Guid gmUserId)
        => readRepository.GetByGmUserIdAsync(gmUserId);
}
