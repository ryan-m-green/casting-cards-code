namespace CastLibrary.Shared.Entities;

public class PlayerCardTraitEntity
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public string TraitType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
}
