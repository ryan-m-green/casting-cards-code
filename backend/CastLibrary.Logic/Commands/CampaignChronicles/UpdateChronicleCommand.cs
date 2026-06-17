using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public class UpdateChronicleCommand(Guid campaignId, Guid chronicleId, UpdateChronicleRequest request)
{
    public Guid CampaignId { get; } = campaignId;
    public Guid ChronicleId { get; } = chronicleId;
    public UpdateChronicleRequest Request { get; } = request;
}
