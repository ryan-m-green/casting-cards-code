namespace CastLibrary.Shared.Responses;

public class ConditionResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Consequence { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = [];
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
