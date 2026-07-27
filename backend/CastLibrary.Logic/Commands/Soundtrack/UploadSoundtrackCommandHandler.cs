using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Soundtrack;

public interface IUploadSoundtrackCommandHandler
{
    Task<SoundtrackDomain> HandleAsync(UploadSoundtrackCommand command);
}

public class UploadSoundtrackCommandHandler(
    ISoundtrackInsertRepository insertRepository,
    ICampaignReadRepository campaignReadRepository,
    IAudioFileStorageOperator audioStorage,
    IImageKeyCreator imageKeyCreator) : IUploadSoundtrackCommandHandler
{
    public async Task<SoundtrackDomain> HandleAsync(UploadSoundtrackCommand command)
    {
        var campaign = await campaignReadRepository.GetByIdAsync(command.CampaignId);
        if (campaign is null)
            throw new ArgumentException($"Campaign {command.CampaignId} not found");

        var soundtrackId = Guid.NewGuid();
        var fileExtension = Path.GetExtension(command.FileName).ToLowerInvariant();
        var key = imageKeyCreator.Create(campaign.DmUserId, command.CampaignId, soundtrackId, EntityType.Soundtrack) + fileExtension;
        var fileNameWithExtension = $"{soundtrackId}{fileExtension}";
        
        await audioStorage.SaveAsync(key, command.Stream, command.ContentType);
        var fileUrl = audioStorage.GetPublicUrl(key);

        var domain = new SoundtrackDomain
        {
            Id = soundtrackId,
            CampaignId = command.CampaignId,
            Title = command.Title.Trim(),
            FileName = fileNameWithExtension,
            FileUrl = fileUrl,
            Volume = command.Volume,
            IsLoop = command.IsLoop,
            CreatedAt = DateTime.UtcNow
        };

        return await insertRepository.AddAsync(domain);
    }
}

public class UploadSoundtrackCommand
{
    public UploadSoundtrackCommand(Guid campaignId, string title, string fileName, Stream stream, string contentType, int volume, bool isLoop)
    {
        CampaignId = campaignId;
        Title = title;
        FileName = fileName;
        Stream = stream;
        ContentType = contentType;
        Volume = volume;
        IsLoop = isLoop;
    }

    public Guid CampaignId { get; }
    public string Title { get; }
    public string FileName { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
    public int Volume { get; }
    public bool IsLoop { get; }
}
