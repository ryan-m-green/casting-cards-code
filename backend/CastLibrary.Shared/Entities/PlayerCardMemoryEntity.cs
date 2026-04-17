namespace CastLibrary.Shared.Entities;

public class PlayerCardMemoryEntity
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public string MemoryType { get; set; } = string.Empty;
    public int? SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string MemoryDate { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
