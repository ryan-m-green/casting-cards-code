using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Cast;

public interface ICreateCastCommandHandler
{
    Task<CastDomain> HandleAsync(CreateCastCommand command);
}
public class CreateCastCommandHandler(
    ICastInsertRepository castRepository,
    ICastFactory castFactory) : ICreateCastCommandHandler
{
    public async Task<CastDomain> HandleAsync(CreateCastCommand command)
    {
        var domain = castFactory.Create(command.Request, command.DmUserId);
        return await castRepository.InsertAsync(domain);
    }
}

public class CreateCastCommand
{
    public CreateCastCommand(Guid dmUserId, CreateCastRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateCastRequest Request { get; }
}
