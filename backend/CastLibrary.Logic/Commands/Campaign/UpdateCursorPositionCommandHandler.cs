using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCursorPositionCommandHandler
{
    Task HandleAsync(UpdateCursorPositionCommand command);
}

public class UpdateCursorPositionCommandHandler(
    ITimeOfDayWriteRepository writeRepository) : IUpdateCursorPositionCommandHandler
{
    public Task HandleAsync(UpdateCursorPositionCommand command) =>
        writeRepository.UpdateCursorAsync(command.CampaignId, command.PositionPercent);
}

public class UpdateCursorPositionCommand(Guid campaignId, decimal positionPercent)
{
    public Guid CampaignId { get; } = campaignId;
    public decimal PositionPercent { get; } = positionPercent;
}
