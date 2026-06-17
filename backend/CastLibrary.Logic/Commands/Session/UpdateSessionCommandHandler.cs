using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Session;

public interface IUpdateSessionCommandHandler
{
    Task<SessionDomain> HandleAsync(UpdateSessionCommand command);
}

public class UpdateSessionCommandHandler(
    ISessionReadRepository sessionReadRepository,
    ISessionUpdateRepository sessionUpdateRepository) : IUpdateSessionCommandHandler
{
    public async Task<SessionDomain> HandleAsync(UpdateSessionCommand command)
    {
        var session = await sessionReadRepository.GetByIdAsync(command.SessionId);
        if (session == null)
            throw new InvalidOperationException("Session not found.");

        await sessionUpdateRepository.UpdateAsync(session);
        return session;
    }
}
