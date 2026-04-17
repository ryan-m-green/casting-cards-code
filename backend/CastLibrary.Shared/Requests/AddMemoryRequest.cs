using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Requests;

public class AddMemoryRequest
{
    public MemoryType MemoryType { get; set; }
    public int? SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
}
