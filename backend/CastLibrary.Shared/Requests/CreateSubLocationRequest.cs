namespace CastLibrary.Shared.Requests;

public class CreateSublocationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DmNotes { get; set; } = string.Empty;
    public Guid? LocationId { get; set; }
    public List<ShopItemRequest> ShopItems { get; set; } = [];
}

public class ShopItemRequest
{
    public string Name { get; set; } = string.Empty;
    public int PriceAmount { get; set; }
    public string PriceCurrencyType { get; set; } = "gp";
    public string Description { get; set; } = string.Empty;
}
