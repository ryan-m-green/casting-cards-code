using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.Soundtrack;

public interface IUploadSoundtrackCommandHandler
{
    Task<SoundtrackDomain> HandleAsync(UploadSoundtrackCommand command);
}

public class UploadSoundtrackCommandHandler(
    ISoundtrackInsertRepository insertRepository,
    IAudioFileStorageOperator audioStorage,
    IImageKeyCreator imageKeyCreator) : IUploadSoundtrackCommandHandler
{
    public async Task<SoundtrackDomain> HandleAsync(UploadSoundtrackCommand command)
    {
        var soundtrackId = Guid.NewGuid();
        var fileExtension = Path.GetExtension(command.FileName).ToLowerInvariant();
        var key = imageKeyCreator.Create(command.GmUserId, command.CampaignId ?? Guid.Empty, soundtrackId, EntityType.Soundtrack) + fileExtension;
        var fileNameWithExtension = $"{soundtrackId}{fileExtension}";
        
        await audioStorage.SaveAsync(key, command.Stream, command.ContentType);
        var fileUrl = audioStorage.GetPublicUrl(key);

        var domain = new SoundtrackDomain
        {
            Id = soundtrackId,
            GmUserId = command.GmUserId,
            Title = command.Title.Trim(),
            FileName = fileNameWithExtension,
            FileUrl = fileUrl,
            Volume = command.Volume,
            IsLoop = command.IsLoop,
            Kind = command.Kind,
            CreatedAt = DateTime.UtcNow
        };

        var saved = await insertRepository.AddAsync(domain);

        // A track uploaded from a campaign's own panel is adopted by that campaign as
        // well as landing in the GM's library.
        if (command.CampaignId is Guid campaignId && campaignId != Guid.Empty)
            await insertRepository.LinkAsync(campaignId, saved.Id);

        return saved;
    }
}

public class UploadSoundtrackCommand
{
    public UploadSoundtrackCommand(Guid gmUserId, Guid? campaignId, string title, string fileName, Stream stream, string contentType, int volume, bool isLoop, string kind = "music")
    {
        GmUserId = gmUserId;
        CampaignId = campaignId;
        Title = title;
        FileName = fileName;
        Stream = stream;
        ContentType = contentType;
        Volume = volume;
        IsLoop = isLoop;
        Kind = kind;
    }

    public Guid GmUserId { get; }
    public Guid? CampaignId { get; }
    public string Title { get; }
    public string FileName { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
    public int Volume { get; }
    public bool IsLoop { get; }
    public string Kind { get; }
}
