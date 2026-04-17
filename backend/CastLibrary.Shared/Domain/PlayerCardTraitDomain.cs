using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Domain;

public class PlayerCardTraitDomain
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public TraitType TraitType { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
}
