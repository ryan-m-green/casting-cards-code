namespace CastLibrary.Shared.Requests;

public class ArchiveSessionChroniclesRequest
{
    public Guid CampaignId { get; set; }
    public Guid ArchivedSessionId { get; set; }
}
