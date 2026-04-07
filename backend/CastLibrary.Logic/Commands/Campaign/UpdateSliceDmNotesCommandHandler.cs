using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSliceDmNotesCommandHandler
{
    Task HandleAsync(UpdateSliceDmNotesCommand command);
}

public class UpdateSliceDmNotesCommandHandler(
    ITimeOfDayWriteRepository writeRepository) : IUpdateSliceDmNotesCommandHandler
{
    public Task HandleAsync(UpdateSliceDmNotesCommand command) =>
        writeRepository.UpdateSliceDmNotesAsync(command.SliceId, command.DmNotes);
}

public class UpdateSliceDmNotesCommand(Guid sliceId, string dmNotes)
{
    public Guid SliceId { get; } = sliceId;
    public string DmNotes { get; } = dmNotes;
}
