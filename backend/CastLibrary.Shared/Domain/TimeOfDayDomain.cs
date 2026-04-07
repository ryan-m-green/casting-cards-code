namespace CastLibrary.Shared.Domain;

public class TimeOfDayDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public decimal DayLengthHours { get; set; }
    public decimal CursorPositionPercent { get; set; }
    public List<TimeOfDaySliceDomain> Slices { get; set; } = [];
}

public class TimeOfDaySliceDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal DurationHours { get; set; }
    public int SortOrder { get; set; }
    public string DmNotes { get; set; } = string.Empty;
    public string PlayerNotes { get; set; } = string.Empty;
}
