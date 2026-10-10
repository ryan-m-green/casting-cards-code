namespace CastLibrary.Shared.Requests;

public class UpsertPlayerFieldJournalEntryRequest
{
    public Guid EncounterId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? SourceCastId { get; set; }
    public string Notes { get; set; } = string.Empty;
}
