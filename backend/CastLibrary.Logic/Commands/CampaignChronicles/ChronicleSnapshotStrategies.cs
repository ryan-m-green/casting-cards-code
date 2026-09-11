using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

/// <summary>Player-authored notes (snapshot; the source note is left in place).</summary>
public class PlayerNoteChronicleArchiveStrategy(IChronicleMapper chronicleMapper) : IChronicleArchiveStrategy
{
    public bool Supports(ChronicleContentType contentType) => contentType == ChronicleContentType.PlayerNote;

    public Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Title is required for player notes.");

        return Task.FromResult(new CampaignChroniclesDomain
        {
            ContentType = chronicleMapper.ToStorageValue(ChronicleContentType.PlayerNote),
            SourceId = request.SourceId,
            Title = request.Title.Trim(),
            Body = request.Body,
            TodSliceName = request.TodSliceName,
            IsGmOnly = request.IsGmOnly ?? false,
            LinkedEntities = chronicleMapper.MapParticipants(request),
            PlayedOn = (request.PlayedOn ?? DateTime.UtcNow).Date,
            SessionNumber = request.SessionNumber
        });
    }
}

/// <summary>
/// Secrets delivered by the GM default to GM-only. Set isGmOnly=false to share the
/// secret's chronicle entry with everyone.
/// </summary>
public class SecretChronicleArchiveStrategy(IChronicleMapper chronicleMapper) : IChronicleArchiveStrategy
{
    public bool Supports(ChronicleContentType contentType) => contentType == ChronicleContentType.Secret;

    public Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request)
    {
        var title = string.IsNullOrWhiteSpace(request.Title) ? "Secret Revealed" : request.Title.Trim();

        return Task.FromResult(new CampaignChroniclesDomain
        {
            ContentType = chronicleMapper.ToStorageValue(ChronicleContentType.Secret),
            SourceId = request.SourceId,
            Title = title,
            Body = request.Body,
            TodSliceName = request.TodSliceName,
            IsGmOnly = request.IsGmOnly ?? true,
            LinkedEntities = chronicleMapper.MapParticipants(request),
            PlayedOn = (request.PlayedOn ?? DateTime.UtcNow).Date,
            SessionNumber = request.SessionNumber
        });
    }
}

