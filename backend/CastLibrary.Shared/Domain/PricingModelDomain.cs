using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Domain;
public class PricingModelDomain
{
    public Guid Id { get; set; }
    public PricingModelName ModelName { get; set; }
    public int PriceInCents { get; set; }
    public string StripePriceId { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
