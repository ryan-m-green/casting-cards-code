using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
namespace CastLibrary.Repository.Mappers;
public interface IPricingModelEntityMapper
{
    PricingModelDomain ToDomain(PricingModelEntity entity);
    PricingModelEntity ToEntity(PricingModelDomain domain);
}
public class PricingModelEntityMapper : IPricingModelEntityMapper
{
    public PricingModelDomain ToDomain(PricingModelEntity entity) => new()
    {
        Id = entity.Id,
        ModelName = Enum.Parse<PricingModelName>(entity.ModelName, true),
        PriceInCents = entity.PriceInCents,
        StripePriceId = entity.StripePriceId,
        IsActive = entity.IsActive
    };
    public PricingModelEntity ToEntity(PricingModelDomain domain) => new()
    {
        Id = domain.Id,
        ModelName = domain.ModelName.ToString(),
        PriceInCents = domain.PriceInCents,
        StripePriceId = domain.StripePriceId,
        IsActive = domain.IsActive
    };
}
