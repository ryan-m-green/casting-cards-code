using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUploadCampaignEventHandoutImageCommandHandler
{
    Task<string> HandleAsync(UploadCampaignEventHandoutImageCommand command);
}

public class UploadCampaignEventHandoutImageCommandHandler(
    IStorylineUpdateRepository updateRepository,
    IImageStorageOperator imageStorage) : IUploadCampaignEventHandoutImageCommandHandler
{
    public async Task<string> HandleAsync(UploadCampaignEventHandoutImageCommand command)
    {
        var key = $"{command.CampaignId}/handouts/{command.EventId}.png";

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
