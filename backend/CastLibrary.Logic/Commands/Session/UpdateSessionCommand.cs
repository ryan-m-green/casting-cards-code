using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Session;

public class UpdateSessionCommand
{
    public UpdateSessionCommand(Guid sessionId, UpdateSessionRequest request)
    {
        SessionId = sessionId;
        Request = request;
    }

    public Guid SessionId { get; }
    public UpdateSessionRequest Request { get; }
}
