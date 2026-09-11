using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using ChronicleLinkedEntity = CastLibrary.Shared.Domain.LinkedEntityTrigger;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

/// <summary>
/// Storyline scenes &amp; handouts. Resolves the source row for a full snapshot and,
/// per v2 rules, marks the storyline row marked_for_archive=true (copy, not delete).
/// </summary>
public class StorylineChronicleArchiveStrategy(
    IStorylineReadRepository storylineReadRepository,
    IStorylineUpdateRepository storylineUpdateRepository,
    IChronicleMapper chronicleMapper) : IChronicleArchiveStrategy
{
    public bool Supports(ChronicleContentType contentType) =>
        contentType is ChronicleContentType.Scene or ChronicleContentType.Handout;

    public async Task<CampaignChroniclesDomain> BuildAsync(Guid campaignId, CreateChronicleRequest request)
    {
        CampaignStorylineDomain? source = null;

        if (request.SourceId.HasValue)
        {
            source = await storylineReadRepository.GetByIdAsync(request.SourceId.Value);
            if (source is not null && source.CampaignId != campaignId)
                throw new ArgumentException("Storyline item does not belong to this campaign.");

            if (source is not null)
            {
                // v2 copy semantics: mark the storyline item as chronicled instead of deleting it.
                await storylineUpdateRepository.UpdateMarkedForArchiveAsync(source.Id, true);
            }
        }

        var title = string.IsNullOrWhiteSpace(request.Title)
            ? source?.Title ?? string.Empty
            : request.Title.Trim();

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.");

        var body = string.IsNullOrWhiteSpace(request.Body)
            ? source?.Body ?? string.Empty
            : request.Body;

        var participants = chronicleMapper.MapParticipants(request);
        if (participants.Count == 0 && source is not null)
        {
            participants.Add(new ChronicleLinkedEntity
            {
                EntityType = chronicleMapper.ToStorageValue(request.ContentType),
                EntityId = source.Id.ToString(),
                EntityName = chronicleMapper.ToLabel(request.ContentType)
            });
        }

        return new CampaignChroniclesDomain
        {
            ContentType = chronicleMapper.ToStorageValue(request.ContentType),
            SourceId = source?.Id ?? request.SourceId,
            Title = title,
            Body = body,
            FilePath = source?.FilePath ?? string.Empty,
            TodSliceName = request.TodSliceName,
            IsGmOnly = request.IsGmOnly ?? false,
            LinkedEntities = participants,
            PlayedOn = (request.PlayedOn ?? DateTime.UtcNow).Date,
            SessionNumber = request.SessionNumber
        };
    }
}
