using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUploadCampaignEventHandoutImageCommandHandler
{
    Task<string> HandleAsync(UploadCampaignEventHandoutImageCommand command);
}

public class UploadCampaignEventHandoutImageCommandHandler(
    IStorylineUpdateRepository updateRepository,
    IImageStorageOperator imageStorage,
    ICampaignReadRepository campaignReadRepository,
    IImageKeyCreator imageKeyCreator) : IUploadCampaignEventHandoutImageCommandHandler
{
    public async Task<string> HandleAsync(UploadCampaignEventHandoutImageCommand command)
    {
        var campaign = await campaignReadRepository.GetByIdAsync(command.CampaignId);
        if (campaign is null)
            throw new ArgumentException($"Campaign {command.CampaignId} not found");

        var key = imageKeyCreator.Create(campaign.DmUserId, command.CampaignId, command.EventId, EntityType.CampaignHandout);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);
        await updateRepository.UpdateFilePathAsync(command.EventId, key);

        return imageStorage.GetPublicUrl(key);
    }
}

public class UploadCampaignEventHandoutImageCommand
{
    public UploadCampaignEventHandoutImageCommand(Guid campaignId, Guid eventId, Stream stream, string contentType)
    {
        CampaignId  = campaignId;
        EventId     = eventId;
        Stream      = stream;
        ContentType = contentType;
    }

    public Guid   CampaignId  { get; }
    public Guid   EventId     { get; }
    public Stream Stream      { get; }
    public string ContentType { get; }
}
