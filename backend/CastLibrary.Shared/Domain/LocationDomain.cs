namespace CastLibrary.Shared.Domain;

public class LocationDomain
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty;
    public string Geography { get; set; } = string.Empty;
    public string Architecture { get; set; } = string.Empty;
    public string Climate { get; set; } = string.Empty;
    public string Religion { get; set; } = string.Empty;
    public string Vibe { get; set; } = string.Empty;
    public string Languages { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
