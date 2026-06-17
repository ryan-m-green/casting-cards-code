using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.Logic.Commands.CampaignChronicles;

public interface IDeleteSessionCommandHandler
{
    Task<bool> HandleAsync(DeleteSessionCommand command);
}

public class DeleteSessionCommandHandler(
    ISessionDeleteRepository repository) : IDeleteSessionCommandHandler
{
    public async Task<bool> HandleAsync(DeleteSessionCommand command)
    {
        return await repository.DeleteAsync(command.CampaignId, command.SessionId);
    }
}
