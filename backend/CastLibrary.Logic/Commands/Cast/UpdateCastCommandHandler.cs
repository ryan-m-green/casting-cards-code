using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Cast;

public interface IUpdateCastCommandHandler
{
    Task<CastDomain> HandleAsync(UpdateCastCommand command);
}
public class UpdateCastCommandHandler(
    ICastReadRepository castReadRepository,
    ICastUpdateRepository castUpdateRepository) : IUpdateCastCommandHandler
{
    public async Task<CastDomain> HandleAsync(UpdateCastCommand command)
    {
        var existing = await castReadRepository.GetByIdAsync(command.Id);
        if (existing is null || existing.DmUserId != command.DmUserId) return null;

        existing.Name = command.Request.Name;
        existing.Pronouns = command.Request.Pronouns;
        existing.Race = command.Request.Race;
        existing.Role = command.Request.Role;
        existing.Age = command.Request.Age;
        existing.Alignment = command.Request.Alignment;
        existing.Posture = command.Request.Posture;
        existing.Speed = command.Request.Speed;
        existing.VoicePlacement = command.Request.VoicePlacement;
        existing.Description = command.Request.Description;
        existing.PublicDescription = command.Request.PublicDescription;

        return await castUpdateRepository.UpdateAsync(existing);
    }
}

public class UpdateCastCommand
{
    public UpdateCastCommand(Guid id, CreateCastRequest request, Guid dmUserId)
    {
        Id = id;
        Request = request;
        DmUserId = dmUserId;
    }

    public Guid Id { get; }
    public CreateCastRequest Request { get; }
    public Guid DmUserId { get; }
}
