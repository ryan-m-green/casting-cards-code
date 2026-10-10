using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public record AddChronicleCommand(Guid CampaignId, CreateChronicleRequest Request);
