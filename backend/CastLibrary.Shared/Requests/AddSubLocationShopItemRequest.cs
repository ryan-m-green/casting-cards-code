namespace CastLibrary.Shared.Requests;

public class AddSublocationShopItemRequest
{
    public string Name             { get; set; } = string.Empty;
    public int    PriceAmount      { get; set; }
    public string PriceCurrencyType { get; set; } = "gp";
    public string Description      { get; set; } = string.Empty;
}

public class UpdateSublocationShopItemRequest
{
    public string Name              { get; set; } = string.Empty;
    public int    PriceAmount       { get; set; }
    public string PriceCurrencyType { get; set; } = "gp";
}
