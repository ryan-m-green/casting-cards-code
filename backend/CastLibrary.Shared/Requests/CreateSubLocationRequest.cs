namespace CastLibrary.Shared.Requests;

public class CreateSublocationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? LocationId { get; set; }
    public List<ShopItemRequest> ShopItems { get; set; } = [];
}

public class ShopItemRequest
{
    public string Name { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
