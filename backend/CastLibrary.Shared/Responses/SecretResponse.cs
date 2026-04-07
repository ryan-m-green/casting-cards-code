namespace CastLibrary.Shared.Responses;

public class SecretRevealedEvent
{
    public Guid SecretId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public string SecretContent { get; set; } = string.Empty;
}

public class SecretResealedEvent
{
    public Guid SecretId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? CityInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
}

public class CardVisibilityChangedEvent
{
    public Guid CampaignId { get; set; }
    public Guid InstanceId { get; set; }
    public string CardType { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
}

public class BulkCardVisibilityChangedEvent
{
    public Guid CampaignId { get; set; }
    public Guid ParentInstanceId { get; set; }
    public string CardType { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
}
