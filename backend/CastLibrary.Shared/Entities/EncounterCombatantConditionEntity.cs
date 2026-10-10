namespace CastLibrary.Shared.Entities;

public class EncounterCombatantConditionEntity
{
    public Guid Id { get; set; }
    public Guid CombatantId { get; set; }
    public string ConditionName { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
}
