using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Factories;

public interface ICampaignChronicleFeedFactory
{
    List<CampaignChronicleFeedItemResponse> CreateFromRawData(IEnumerable<CampaignChroniclesDomain> entries);
}

/// <summary>
/// Maps v2 standalone chronicle feed entries onto their API response, resolving any
/// stored file (e.g. a handout image) to a public URL.
/// </summary>
public class CampaignChronicleFeedFactory(IImageStorageOperator imageStorageOperator) : ICampaignChronicleFeedFactory
{
    public List<CampaignChronicleFeedItemResponse> CreateFromRawData(IEnumerable<CampaignChroniclesDomain> entries) =>
        entries.Select(ToResponse).ToList();

    private CampaignChronicleFeedItemResponse ToResponse(CampaignChroniclesDomain entry) => new()
    {
        Id = entry.Id,
        CampaignId = entry.CampaignId,
        ContentType = entry.ContentType,
        SourceId = entry.SourceId,
        Title = entry.Title,
        Body = entry.Body,
        SortOrder = entry.SortOrder,
        LinkedEntities = entry.LinkedEntities,
        FilePath = entry.FilePath,
        ImageUrl = string.IsNullOrWhiteSpace(entry.FilePath) ? null : imageStorageOperator.GetPublicUrl(entry.FilePath),
        TodSliceName = entry.TodSliceName,
        IsGmOnly = entry.IsGmOnly,
        PlayedOn = entry.PlayedOn,
        SessionNumber = entry.SessionNumber,
        ArchivedAt = entry.ArchivedAt,
        CreatedAt = entry.CreatedAt,
        UpdatedAt = entry.UpdatedAt,
        Keywords = entry.Keywords
    };
}
