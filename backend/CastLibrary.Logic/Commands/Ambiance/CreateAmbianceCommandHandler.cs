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
            GmUserId = command.GmUserId,
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

        var saved = await insertRepository.AddAsync(domain);

        // A playlist built from a campaign's panel is adopted by that campaign too.
        if (command.CampaignId is Guid campaignId && campaignId != Guid.Empty)
            await insertRepository.LinkAsync(campaignId, saved.Id);

        return saved;
    }
}

public class CreateAmbianceCommand
{
    public CreateAmbianceCommand(Guid gmUserId, Guid? campaignId, string title, List<AmbianceItemInput> items, bool randomizeMusic = false)
    {
        GmUserId = gmUserId;
        CampaignId = campaignId;
        Title = title;
        Items = items;
        RandomizeMusic = randomizeMusic;
    }

    public Guid GmUserId { get; }
    public Guid? CampaignId { get; }
    public string Title { get; }
    public List<AmbianceItemInput> Items { get; }
    public bool RandomizeMusic { get; }
}
