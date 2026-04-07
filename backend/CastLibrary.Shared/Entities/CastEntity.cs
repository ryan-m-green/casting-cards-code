namespace CastLibrary.Shared.Entities;

public class CastEntity
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Pronouns { get; set; }
    public string Race { get; set; }
    public string Role { get; set; }
    public string Age { get; set; }
    public string Alignment { get; set; }
    public string Posture { get; set; }
    public string Speed { get; set; }
    public string[] VoicePlacement { get; set; }
    public string VoiceNotes { get; set; }
    public string Description { get; set; }
    public string PublicDescription { get; set; }
    public DateTime CreatedAt { get; set; }
}
