namespace CastLibrary.Shared.Responses;

public class PlayerFieldJournalEntryResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid EncounterId { get; set; }
    public string CardKey { get; set; } = string.Empty;
    public Guid? CastInstanceId { get; set; }
    public Guid? SourceCastId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}
