namespace CastLibrary.Shared.Responses;

public class PlayerCardConditionResponse
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public string ConditionName { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
}
