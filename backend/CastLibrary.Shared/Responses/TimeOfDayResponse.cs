namespace CastLibrary.Shared.Responses;

public class TimeOfDayResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public decimal DayLengthHours { get; set; }
    public decimal CursorPositionPercent { get; set; }
    public List<TimeOfDaySliceResponse> Slices { get; set; } = [];
}

public class TimeOfDaySliceResponse
{
    public Guid Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal DurationHours { get; set; }
    public decimal StartPercent { get; set; }
    public decimal EndPercent { get; set; }
    public string DmNotes { get; set; } = string.Empty;
    public string PlayerNotes { get; set; } = string.Empty;
}
