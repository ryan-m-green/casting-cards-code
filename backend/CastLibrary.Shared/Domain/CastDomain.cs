namespace CastLibrary.Shared.Domain;

public class CastDomain
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Pronouns { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Age { get; set; } = string.Empty;
    public string Alignment { get; set; } = string.Empty;
    public string Posture { get; set; } = string.Empty;
    public string Speed { get; set; } = string.Empty;
    public string[] VoicePlacement { get; set; } = [];
    public string Description { get; set; } = string.Empty;
    public string PublicDescription { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
