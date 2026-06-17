namespace CastLibrary.Logic.Commands.Session;

public record EndSessionCommand(Guid CampaignId, int EndDay, string AlternateTitle);
