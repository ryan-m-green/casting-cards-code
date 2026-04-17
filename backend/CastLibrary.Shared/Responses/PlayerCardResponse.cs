namespace CastLibrary.Shared.Responses;

public record CurrencyBalanceResponse(string Currency, int Amount);

public class PlayerCardResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid PlayerUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public List<PlayerCardConditionResponse> Conditions { get; set; } = [];
    public List<CurrencyBalanceResponse> CurrencyBalances { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
