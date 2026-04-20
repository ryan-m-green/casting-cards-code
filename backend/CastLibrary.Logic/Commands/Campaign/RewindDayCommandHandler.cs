using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRewindDayCommandHandler
{
    Task<int> HandleAsync(RewindDayCommand command);
}

public class RewindDayCommandHandler(
    ITimeOfDayWriteRepository writeRepository) : IRewindDayCommandHandler
{
    public Task<int> HandleAsync(RewindDayCommand command) =>
        writeRepository.RewindDayAsync(command.CampaignId);
}

public class RewindDayCommand(Guid campaignId)
{
    public Guid CampaignId { get; } = campaignId;
}
