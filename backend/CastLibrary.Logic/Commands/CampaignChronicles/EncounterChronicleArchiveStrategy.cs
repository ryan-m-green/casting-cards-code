using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public class EncounterChronicleArchiveStrategy(IChronicleMapper chronicleMapper) : IChronicleArchiveStrategy
{
    public bool Supports(ChronicleContentType contentType) => contentType == ChronicleContentType.Encounter;

    public Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request)
    {
        var title = string.IsNullOrWhiteSpace(request.Title) ? "Encounter" : request.Title.Trim();

        return Task.FromResult(new CampaignChroniclesDomain
        {
            ContentType = chronicleMapper.ToStorageValue(ChronicleContentType.Encounter),
            SourceId = request.SourceId,
            Title = title,
            Body = request.Body,
            TodSliceName = request.TodSliceName,
            IsGmOnly = request.IsGmOnly ?? false,
            LinkedEntities = chronicleMapper.MapParticipants(request),
            PlayedOn = (request.PlayedOn ?? DateTime.UtcNow).Date,
            SessionNumber = request.SessionNumber
        });
    }
}
