namespace CastLibrary.Shared.Responses;

public class ChroniclesResponse
{
    public List<ChroniclesSessionResponse> Sessions { get; set; } = [];
    public int TotalSessions { get; set; }
    public int TotalChronicles { get; set; }
    public int CurrentPage { get; set; }
    public int TotalPages { get; set; }
}
