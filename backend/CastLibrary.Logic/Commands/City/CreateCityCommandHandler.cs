using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.City;

public interface ICreateCityCommandHandler
{
    Task<CityDomain> HandleAsync(CreateCityCommand command);
}
public class CreateCityCommandHandler(ICityInsertRepository cityInsertRepository) : ICreateCityCommandHandler
{
    public async Task<CityDomain> HandleAsync(CreateCityCommand command)
    {
        var domain = new CityDomain
        {
            Id = Guid.NewGuid(), DmUserId = command.DmUserId, Name = command.Request.Name,
            Classification = command.Request.Classification, Size = command.Request.Size,
            Condition = command.Request.Condition, Geography = command.Request.Geography,
            Architecture = command.Request.Architecture, Climate = command.Request.Climate,
            Religion = command.Request.Religion, Vibe = command.Request.Vibe, Languages = command.Request.Languages,
            Description = command.Request.Description, CreatedAt = DateTime.UtcNow,
        };
        return await cityInsertRepository.InsertAsync(domain);
    }
}

public class CreateCityCommand
{
    public CreateCityCommand(Guid dmUserId, CreateCityRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateCityRequest Request { get; }
}
