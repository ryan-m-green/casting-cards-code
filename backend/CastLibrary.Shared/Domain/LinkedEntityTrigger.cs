namespace CastLibrary.Shared.Domain;

public class LinkedEntityTrigger
{
    public string EntityType { get; set; }
    public string EntityId { get; set; }
    public string EntityName { get; set; }
    public decimal? TodPositionPercent { get; set; }
    public string originalEntityType { get; set; }
}
