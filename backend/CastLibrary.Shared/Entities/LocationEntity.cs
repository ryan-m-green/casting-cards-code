namespace CastLibrary.Shared.Entities;

public class LocationEntity
{
    public Guid Id { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Classification { get; set; }
    public string Size { get; set; }
    public string Condition { get; set; }
    public string Geography { get; set; }
    public string Architecture { get; set; }
    public string Climate { get; set; }
    public string Religion { get; set; }
    public string Vibe { get; set; }
    public string Languages { get; set; }
    public string Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
