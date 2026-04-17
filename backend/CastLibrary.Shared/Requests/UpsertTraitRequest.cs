using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Requests;

public class UpsertTraitRequest
{
    public Guid? Id { get; set; }
    public TraitType TraitType { get; set; }
    public string Content { get; set; } = string.Empty;
}
