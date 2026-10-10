using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

/// <summary>
/// Builds a v2 chronicle row for a given content type. Strategies COPY their source
/// content into the chronicle feed - they never delete the source.
/// </summary>
public interface IChronicleArchiveStrategy
{
    bool Supports(ChronicleContentType contentType);

    Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request);
}

