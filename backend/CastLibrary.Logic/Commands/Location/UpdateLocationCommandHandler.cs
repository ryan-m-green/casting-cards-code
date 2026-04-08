using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Location;

public interface IUpdateLocationCommandHandler
{
    Task<LocationDomain> HandleAsync(UpdateLocationCommand command);
}
public class UpdateLocationCommandHandler(
    ILocationReadRepository locationReadRepository,
    ILocationUpdateRepository locationUpdateRepository) : IUpdateLocationCommandHandler
{
    public async Task<LocationDomain> HandleAsync(UpdateLocationCommand command)
    {
        var existing = await locationReadRepository.GetByIdAsync(command.Id);
        if (existing is null || existing.DmUserId != command.DmUserId) return null;
        existing.Name = command.Request.Name; existing.Classification = command.Request.Classification;
        existing.Size = command.Request.Size; existing.Condition = command.Request.Condition;
        existing.Geography = command.Request.Geography; existing.Architecture = command.Request.Architecture;
        existing.Climate = command.Request.Climate; existing.Religion = command.Request.Religion;
        existing.Vibe = command.Request.Vibe; existing.Languages = command.Request.Languages;
        existing.Description = command.Request.Description;
        return await locationUpdateRepository.UpdateAsync(existing);
    }
}

public class UpdateLocationCommand
{
    public UpdateLocationCommand(Guid id, CreateLocationRequest request, Guid dmUserId)
    {
        Id = id;
        Request = request;
        DmUserId = dmUserId;
    }

    public Guid Id { get; }
    public CreateLocationRequest Request { get; }
    public Guid DmUserId { get; }
}

