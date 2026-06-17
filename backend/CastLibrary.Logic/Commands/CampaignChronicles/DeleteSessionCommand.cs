namespace CastLibrary.Logic.Commands.CampaignChronicles;

public class DeleteSessionCommand(Guid campaignId, Guid sessionId)
{
    public Guid CampaignId { get; } = campaignId;
    public Guid SessionId { get; } = sessionId;
}
