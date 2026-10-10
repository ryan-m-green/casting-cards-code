using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Ambiance;

public interface ICreateAmbianceCommandHandler
{
    Task<AmbianceDomain> HandleAsync(CreateAmbianceCommand command);
}

public class CreateAmbianceCommandHandler(
    IAmbianceInsertRepository insertRepository) : ICreateAmbianceCommandHandler
{
    public async Task<AmbianceDomain> HandleAsync(CreateAmbianceCommand command)
    {
        var ambianceId = Guid.NewGuid();

        var domain = new AmbianceDomain
        {
            Id = ambianceId,
            CampaignId = command.CampaignId,
            Title = command.Title.Trim(),
            CreatedAt = DateTime.UtcNow,
            RandomizeMusic = command.RandomizeMusic,
            Items = command.Items.Select((item, index) => new AmbianceItemDomain
            {
                Id = Guid.NewGuid(),
                AmbianceId = ambianceId,
                SoundtrackId = item.SoundtrackId,
                SortOrder = index,
                Volume = item.Volume,
                PauseMode = item.PauseMode,
                PauseDelaySeconds = item.PauseDelaySeconds,
                PauseMinSeconds = item.PauseMinSeconds,
                PauseMaxSeconds = item.PauseMaxSeconds
            }).ToList()
        };

        return await insertRepository.AddAsync(domain);
    }
}

public class CreateAmbianceCommand
{
    public CreateAmbianceCommand(Guid campaignId, string title, List<AmbianceItemInput> items, bool randomizeMusic = false)
    {
        CampaignId = campaignId;
        Title = title;
        Items = items;
        RandomizeMusic = randomizeMusic;
    }

    public Guid CampaignId { get; }
    public string Title { get; }
    public List<AmbianceItemInput> Items { get; }
    public bool RandomizeMusic { get; }
}
