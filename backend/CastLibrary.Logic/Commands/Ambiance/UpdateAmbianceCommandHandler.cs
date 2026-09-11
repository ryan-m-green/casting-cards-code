using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Ambiance;

public interface IUpdateAmbianceCommandHandler
{
    Task<AmbianceDomain> HandleAsync(UpdateAmbianceCommand command);
}

public class UpdateAmbianceCommandHandler(
    IAmbianceReadRepository readRepository,
    IAmbianceUpdateRepository updateRepository) : IUpdateAmbianceCommandHandler
{
    public async Task<AmbianceDomain> HandleAsync(UpdateAmbianceCommand command)
    {
        var existing = await readRepository.GetByIdAsync(command.AmbianceId);
        if (existing is null)
            throw new ArgumentException($"Ambiance {command.AmbianceId} not found");

        existing.Title = command.Title.Trim();
        existing.RandomizeMusic = command.RandomizeMusic;
        existing.Items = command.Items.Select((item, index) => new AmbianceItemDomain
        {
            Id = Guid.NewGuid(),
            AmbianceId = command.AmbianceId,
            SoundtrackId = item.SoundtrackId,
            SortOrder = index,
            Volume = item.Volume,
            PauseMode = item.PauseMode,
            PauseDelaySeconds = item.PauseDelaySeconds,
            PauseMinSeconds = item.PauseMinSeconds,
            PauseMaxSeconds = item.PauseMaxSeconds
        }).ToList();

        return await updateRepository.UpdateAsync(existing);
    }
}

public class UpdateAmbianceCommand
{
    public UpdateAmbianceCommand(Guid ambianceId, string title, List<AmbianceItemInput> items, bool randomizeMusic = false)
    {
        AmbianceId = ambianceId;
        Title = title;
        Items = items;
        RandomizeMusic = randomizeMusic;
    }

    public Guid AmbianceId { get; }
    public string Title { get; }
    public List<AmbianceItemInput> Items { get; }
    public bool RandomizeMusic { get; }
}
