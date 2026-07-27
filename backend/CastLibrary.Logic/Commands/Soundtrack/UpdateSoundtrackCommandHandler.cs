using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Soundtrack;

public interface IUpdateSoundtrackCommandHandler
{
    Task<SoundtrackDomain> HandleAsync(UpdateSoundtrackCommand command);
}

public class UpdateSoundtrackCommandHandler(
    ISoundtrackReadRepository readRepository,
    ISoundtrackUpdateRepository updateRepository) : IUpdateSoundtrackCommandHandler
{
    public async Task<SoundtrackDomain> HandleAsync(UpdateSoundtrackCommand command)
    {
        var existing = await readRepository.GetByIdAsync(command.SoundtrackId);
        if (existing is null)
            throw new ArgumentException($"Soundtrack {command.SoundtrackId} not found");

        // Validate volume range
        if (command.Volume < 0 || command.Volume > 100)
            throw new ArgumentException("Volume must be between 0 and 100");

        // Validate loop delay range if provided
        if (command.LoopDelaySeconds.HasValue && (command.LoopDelaySeconds < 1 || command.LoopDelaySeconds > 60))
            throw new ArgumentException("Loop delay must be between 1 and 60 seconds");

        existing.Title = command.Title.Trim();
        existing.Volume = command.Volume;
        existing.IsLoop = command.IsLoop;
        existing.LoopDelaySeconds = command.LoopDelaySeconds;

        return await updateRepository.UpdateAsync(existing);
    }
}

public class UpdateSoundtrackCommand
{
    public UpdateSoundtrackCommand(Guid soundtrackId, string title, int volume, bool isLoop, int? loopDelaySeconds = null)
    {
        SoundtrackId = soundtrackId;
        Title = title;
        Volume = volume;
        IsLoop = isLoop;
        LoopDelaySeconds = loopDelaySeconds;
    }

    public Guid SoundtrackId { get; }
    public string Title { get; }
    public int Volume { get; }
    public bool IsLoop { get; }
    public int? LoopDelaySeconds { get; }
}
