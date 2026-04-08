using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Location;

public interface ICreateLocationCommandHandler
{
    Task<LocationDomain> HandleAsync(CreateLocationCommand command);
}
public class CreateLocationCommandHandler(ILocationInsertRepository locationInsertRepository) : ICreateLocationCommandHandler
{
    public async Task<LocationDomain> HandleAsync(CreateLocationCommand command)
    {
        var domain = new LocationDomain
        {
            Id = Guid.NewGuid(), DmUserId = command.DmUserId, Name = command.Request.Name,
            Classification = command.Request.Classification, Size = command.Request.Size,
            Condition = command.Request.Condition, Geography = command.Request.Geography,
            Architecture = command.Request.Architecture, Climate = command.Request.Climate,
            Religion = command.Request.Religion, Vibe = command.Request.Vibe, Languages = command.Request.Languages,
            Description = command.Request.Description, CreatedAt = DateTime.UtcNow,
        };
        return await locationInsertRepository.InsertAsync(domain);
    }
}

public class CreateLocationCommand
{
    public CreateLocationCommand(Guid dmUserId, CreateLocationRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateLocationRequest Request { get; }
}

