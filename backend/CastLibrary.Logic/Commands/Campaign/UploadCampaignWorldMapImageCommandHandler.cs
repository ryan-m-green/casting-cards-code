using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUploadCampaignWorldMapImageCommandHandler
{
    Task<string> HandleAsync(UploadCampaignWorldMapImageCommand command);
}

public class UploadCampaignWorldMapImageCommandHandler(
    IImageStorageOperator imageStorage,
    ICampaignReadRepository campaignReadRepository,
    IImageKeyCreator imageKeyCreator) : IUploadCampaignWorldMapImageCommandHandler
{
    public async Task<string> HandleAsync(UploadCampaignWorldMapImageCommand command)
    {
        var campaign = await campaignReadRepository.GetByIdAsync(command.CampaignId);
        if (campaign is null)
            throw new ArgumentException($"Campaign {command.CampaignId} not found");

        var key = imageKeyCreator.Create(campaign.DmUserId, command.CampaignId, command.CampaignId, EntityType.WorldMap);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return imageStorage.GetPublicUrl(key);
    }
}

public class UploadCampaignWorldMapImageCommand
{
    public UploadCampaignWorldMapImageCommand(Guid campaignId, Stream stream, string contentType)
    {
        CampaignId  = campaignId;
        Stream      = stream;
        ContentType = contentType;
    }

    public Guid   CampaignId  { get; }
    public Stream Stream      { get; }
    public string ContentType { get; }
}
