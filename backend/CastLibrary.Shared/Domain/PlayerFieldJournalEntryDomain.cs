namespace CastLibrary.Shared.Domain;

public class PlayerFieldJournalEntryDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid EncounterId { get; set; }
    public string CardKey { get; set; } = string.Empty;
    public Guid? CastInstanceId { get; set; }
    public Guid? SourceCastId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static string CardKeyFor(Guid? castInstanceId, Guid? sourceCastId) =>
        castInstanceId is Guid instanceId
            ? $"instance:{instanceId}"
            : $"cast:{sourceCastId}";
}
