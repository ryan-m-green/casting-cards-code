using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAdvanceDayCommandHandler
{
    Task<int> HandleAsync(AdvanceDayCommand command);
}

public class AdvanceDayCommandHandler(
    ITimeOfDayWriteRepository writeRepository) : IAdvanceDayCommandHandler
{
    public Task<int> HandleAsync(AdvanceDayCommand command) =>
        writeRepository.AdvanceDayAsync(command.CampaignId);
}

public class AdvanceDayCommand(Guid campaignId)
{
    public Guid CampaignId { get; } = campaignId;
}
