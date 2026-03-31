using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.City;

public interface IUpdateCityCommandHandler
{
    Task<CityDomain> HandleAsync(UpdateCityCommand command);
}
public class UpdateCityCommandHandler(
    ICityReadRepository cityReadRepository,
    ICityUpdateRepository cityUpdateRepository) : IUpdateCityCommandHandler
{
    public async Task<CityDomain> HandleAsync(UpdateCityCommand command)
    {
        var existing = await cityReadRepository.GetByIdAsync(command.Id);
        if (existing is null || existing.DmUserId != command.DmUserId) return null;
        existing.Name = command.Request.Name; existing.Classification = command.Request.Classification;
        existing.Size = command.Request.Size; existing.Condition = command.Request.Condition;
        existing.Geography = command.Request.Geography; existing.Architecture = command.Request.Architecture;
        existing.Climate = command.Request.Climate; existing.Religion = command.Request.Religion;
        existing.Vibe = command.Request.Vibe; existing.Languages = command.Request.Languages;
        existing.Description = command.Request.Description;
        return await cityUpdateRepository.UpdateAsync(existing);
    }
}

public class UpdateCityCommand
{
    public UpdateCityCommand(Guid id, CreateCityRequest request, Guid dmUserId)
    {
        Id = id;
        Request = request;
        DmUserId = dmUserId;
    }

    public Guid Id { get; }
    public CreateCityRequest Request { get; }
    public Guid DmUserId { get; }
}
