using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public record MigrateStorylineToChroniclesCommand(Guid CampaignId, Guid ArchivedSessionId);
