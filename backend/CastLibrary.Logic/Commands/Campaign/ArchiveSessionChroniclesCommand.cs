using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public class ArchiveSessionChroniclesCommand(ArchiveSessionChroniclesRequest request)
{
    public ArchiveSessionChroniclesRequest Request { get; } = request;
}
