namespace CastLibrary.Shared.Responses;

public class SublocationResponse
{
    public Guid Id { get; set; }
    public Guid? LocationId { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DmNotes { get; set; } = string.Empty;
    public string ImageUrl { get; set; }
    public List<ShopItemResponse> ShopItems { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class ShopItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int PriceAmount { get; set; }
    public string PriceCurrencyType { get; set; } = "gp";
    public string Description { get; set; } = string.Empty;
    public bool IsScratchedOff { get; set; }
}
