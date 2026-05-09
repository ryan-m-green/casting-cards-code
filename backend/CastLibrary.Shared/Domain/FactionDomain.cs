namespace CastLibrary.Shared.Domain;

public class FactionDomain
{
    public Guid FactionId { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public short Influence { get; set; }
    public short Perception { get; set; }
    public bool Hidden { get; set; }
    public string Description { get; set; }
    public string DmNotes { get; set; }
    public string SymbolPath { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
