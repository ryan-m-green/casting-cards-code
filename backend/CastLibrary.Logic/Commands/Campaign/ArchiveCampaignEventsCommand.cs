using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public class ArchiveCampaignEventsCommand(ArchiveCampaignEventsRequest request)
{
    public ArchiveCampaignEventsRequest Request { get; } = request;
}
