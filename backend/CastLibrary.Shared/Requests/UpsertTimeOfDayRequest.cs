namespace CastLibrary.Shared.Requests;

public class UpsertTimeOfDayRequest
{
    public decimal DayLengthHours { get; set; }
    public List<UpsertTimeOfDaySliceRequest> Slices { get; set; } = [];
}

public class UpsertTimeOfDaySliceRequest
{
    public Guid? Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal DurationHours { get; set; }
    public string DmNotes { get; set; } = string.Empty;
    public string PlayerNotes { get; set; } = string.Empty;
}
