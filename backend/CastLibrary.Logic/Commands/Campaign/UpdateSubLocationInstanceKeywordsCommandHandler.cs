using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateSublocationInstanceKeywordsCommandHandler
{
    Task HandleAsync(UpdateSublocationInstanceKeywordsCommand command);
}

public class UpdateSublocationInstanceKeywordsCommandHandler(
    ICampaignUpdateRepository campaignRepository,
    IUserUpdateRepository userUpdateRepository) : IUpdateSublocationInstanceKeywordsCommandHandler
{
    public async Task HandleAsync(UpdateSublocationInstanceKeywordsCommand command)
    {
        var normalized = (command.Request.Keywords ?? [])
            .Select(k => k.Trim().ToLowerInvariant())
            .Where(k => k.Length > 0)
            .Distinct()
            .ToArray();

        await campaignRepository.UpdateSublocationInstanceKeywordsAsync(command.InstanceId, normalized);
        await userUpdateRepository.MergeKeywordsAsync(command.DmUserId, normalized);
    }
}

public class UpdateSublocationInstanceKeywordsCommand
{
    public UpdateSublocationInstanceKeywordsCommand(Guid instanceId, Guid dmUserId, UpdateInstanceKeywordsRequest request)
    {
        InstanceId = instanceId;
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public Guid DmUserId { get; }
    public UpdateInstanceKeywordsRequest Request { get; }
}
