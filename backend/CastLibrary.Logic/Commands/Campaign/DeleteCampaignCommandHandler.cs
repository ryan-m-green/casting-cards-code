using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCampaignCommandHandler
{
    Task HandleAsync(DeleteCampaignCommand command);
}

public class DeleteCampaignCommandHandler(ICampaignDeleteRepository campaignRepository) : IDeleteCampaignCommandHandler
{
    public Task HandleAsync(DeleteCampaignCommand command) =>
        campaignRepository.DeleteAsync(command.Id);
}

public class DeleteCampaignCommand
{
    public DeleteCampaignCommand(Guid id)
    {
        Id = id;
    }

    public Guid Id { get; }
}
