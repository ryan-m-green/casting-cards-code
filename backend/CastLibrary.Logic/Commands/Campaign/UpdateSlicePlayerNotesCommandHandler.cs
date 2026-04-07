using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSlicePlayerNotesCommandHandler
{
    Task HandleAsync(UpdateSlicePlayerNotesCommand command);
}

public class UpdateSlicePlayerNotesCommandHandler(
    ITimeOfDayWriteRepository writeRepository) : IUpdateSlicePlayerNotesCommandHandler
{
    public Task HandleAsync(UpdateSlicePlayerNotesCommand command) =>
        writeRepository.UpdateSlicePlayerNotesAsync(command.SliceId, command.PlayerNotes);
}

public class UpdateSlicePlayerNotesCommand(Guid sliceId, string playerNotes)
{
    public Guid SliceId { get; } = sliceId;
    public string PlayerNotes { get; } = playerNotes;
}
