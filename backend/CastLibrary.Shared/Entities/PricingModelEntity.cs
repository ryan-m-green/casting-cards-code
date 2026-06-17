namespace CastLibrary.Shared.Entities;
public class PricingModelEntity
{
    public Guid Id { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public int PriceInCents { get; set; }
    public string StripePriceId { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
