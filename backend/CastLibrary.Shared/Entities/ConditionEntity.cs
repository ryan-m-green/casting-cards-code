namespace CastLibrary.Shared.Entities;

public class ConditionEntity
{
    public Guid Id { get; set; }
    public Guid GmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Consequence { get; set; } = string.Empty;
    public string[] Keywords { get; set; } = [];
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
