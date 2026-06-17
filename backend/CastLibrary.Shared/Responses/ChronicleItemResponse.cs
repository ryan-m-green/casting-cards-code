using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Responses;

public class ChronicleItemResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];
    public string ImageUrl { get; set; }
    public string TodSliceName { get; set; }
    public bool IsGmOnly { get; set; }
    public DateTime ArchivedAt { get; set; }
}
