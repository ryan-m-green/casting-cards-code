namespace CastLibrary.Shared.Entities;

public class PlayerCardSecretEntity
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsShared { get; set; }
    public DateTime? SharedAt { get; set; }
    public string? SharedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
