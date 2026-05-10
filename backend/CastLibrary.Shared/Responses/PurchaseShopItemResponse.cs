namespace CastLibrary.Shared.Responses;

public class PurchaseShopItemResponse
{
    public bool   Success         { get; set; }
    public string ItemName        { get; set; } = string.Empty;
    public int    PriceAmount     { get; set; }
    public string PriceCurrencyType { get; set; } = string.Empty;
    public string PlayerDisplayName { get; set; } = string.Empty;
    /// <summary>Set when Success is false.</summary>
    public string DenialReason    { get; set; } = string.Empty;
}
