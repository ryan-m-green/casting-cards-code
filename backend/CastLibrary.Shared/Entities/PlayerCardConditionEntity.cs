namespace CastLibrary.Shared.Entities;

public class PlayerCardConditionEntity
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public string ConditionName { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
}
