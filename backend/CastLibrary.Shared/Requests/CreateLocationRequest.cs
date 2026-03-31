namespace CastLibrary.Shared.Requests;

public class CreateLocationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? CityId { get; set; }
    public List<ShopItemRequest> ShopItems { get; set; } = [];
}

public class ShopItemRequest
{
    public string Name { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
