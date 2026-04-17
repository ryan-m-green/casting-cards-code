using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Responses;

public class PlayerCardMemoryResponse
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public MemoryType MemoryType { get; set; }
    public int? SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime CreatedAt { get; set; }
}
