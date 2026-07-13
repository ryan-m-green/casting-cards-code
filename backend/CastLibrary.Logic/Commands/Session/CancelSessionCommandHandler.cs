using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;

namespace CastLibrary.Logic.Commands.Session;

public interface ICancelSessionCommandHandler
{
    Task HandleAsync(CancelSessionCommand command);
}

public class CancelSessionCommandHandler(
    IActiveSessionDeleteRepository sessionDeleteRepository,
    ISessionReadRepository sessionReadRepository) : ICancelSessionCommandHandler
{
    public async Task HandleAsync(CancelSessionCommand command)
    {
        var activeSession = await sessionReadRepository.GetActiveSessionByCampaignIdAsync(command.CampaignId);
        if (activeSession == null)
            throw new InvalidOperationException("No active session exists for this campaign.");

        await sessionDeleteRepository.DeleteAsync(activeSession.Id);
    }
}

public record CancelSessionCommand(Guid CampaignId);
