namespace CastLibrary.Shared.Requests;

public class AwardCurrencyRequest
{
    public int Amount { get; set; }
    public string Currency { get; set; } = "gp";
    public string Note { get; set; }
    public Guid? PlayerCardId { get; set; }
}
