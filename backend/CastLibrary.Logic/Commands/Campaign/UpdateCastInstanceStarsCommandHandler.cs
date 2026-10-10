using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastInstanceStarsCommandHandler
{
    Task HandleAsync(UpdateCastInstanceStarsCommand command);
}

/// <summary>
/// The stars a cast card wears in the campaign's details — its importance to the party, 1 to 3.
/// Any member of the campaign may set them (players rate the cards they meet), so unlike the rest
/// of a cast instance's fields this is not the DM's alone to write.
/// </summary>
public class UpdateCastInstanceStarsCommandHandler(ICampaignUpdateRepository campaignRepository)
    : IUpdateCastInstanceStarsCommandHandler
{
    public async Task HandleAsync(UpdateCastInstanceStarsCommand command)
    {
        await campaignRepository.UpdateCastInstanceStarsAsync(command.InstanceId, command.Request.StarsCount);
    }
}

public class UpdateCastInstanceStarsCommand
{
    public UpdateCastInstanceStarsCommand(Guid instanceId, UpdateCastInstanceStarsRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public UpdateCastInstanceStarsRequest Request { get; }
}
