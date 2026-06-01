using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IUploadPlayerCardImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadPlayerCardImageCommand command);
}

public class UploadPlayerCardImageCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    ICampaignReadRepository campaignReadRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadPlayerCardImageCommandHandler
{
    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadPlayerCardImageCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId)
            return (false, null);

        var campaign = await campaignReadRepository.GetByIdAsync(card.CampaignId);

        var key = imageKeyCreator.Create(campaign.DmUserId, card.CampaignId, command.PlayerUserId, EntityType.PlayerCard);
        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
    }
}

public class UploadPlayerCardImageCommand
{
    public UploadPlayerCardImageCommand(Guid playerCardId, Guid playerUserId, Stream stream, string contentType)
    {
        PlayerCardId = playerCardId;
        PlayerUserId = playerUserId;
        Stream = stream;
        ContentType = contentType;
    }
    public Guid PlayerCardId { get; }
    public Guid PlayerUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}
