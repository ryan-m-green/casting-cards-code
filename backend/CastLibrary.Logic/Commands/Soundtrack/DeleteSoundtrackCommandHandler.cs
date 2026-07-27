using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Logic.Commands.Soundtrack;

public interface IDeleteSoundtrackCommandHandler
{
    Task HandleAsync(DeleteSoundtrackCommand command);
}

public class DeleteSoundtrackCommandHandler(
    ISoundtrackDeleteRepository deleteRepository,
    ISoundtrackReadRepository readRepository,
    IStorylineUpdateRepository storylineUpdateRepository,
    IAudioFileStorageOperator audioStorage) : IDeleteSoundtrackCommandHandler
{
    public async Task HandleAsync(DeleteSoundtrackCommand command)
    {
        var soundtrack = await readRepository.GetByIdAsync(command.SoundtrackId);
        if (soundtrack is null)
            throw new ArgumentException($"Soundtrack {command.SoundtrackId} not found");

        // Delete file from storage
        var key = ExtractKeyFromUrl(soundtrack.FileUrl);
        if (!string.IsNullOrEmpty(key))
        {
            await audioStorage.DeleteAsync(key);
        }

        // Update linked events to remove SoundtrackId
        await storylineUpdateRepository.RemoveSoundtrackIdFromAllEventsAsync(command.SoundtrackId);

        // Delete from database
        await deleteRepository.DeleteAsync(command.SoundtrackId);
    }

    private string ExtractKeyFromUrl(string fileUrl)
    {
        // Extract the key from the public URL
        // Assuming URL format: https://domain.com/audio/key
        if (string.IsNullOrEmpty(fileUrl))
            return string.Empty;

        var uri = new Uri(fileUrl);
        var path = uri.AbsolutePath.TrimStart('/');
        // Remove the /audio/ prefix since DeleteAsync adds it back
        return path.StartsWith("audio/") ? path.Substring(6) : path;
    }
}

public class DeleteSoundtrackCommand
{
    public DeleteSoundtrackCommand(Guid soundtrackId)
    {
        SoundtrackId = soundtrackId;
    }

    public Guid SoundtrackId { get; }
}
