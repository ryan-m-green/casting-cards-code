using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateLocationInstanceKeywordsCommandHandler
{
    Task HandleAsync(UpdateLocationInstanceKeywordsCommand command);
}

public class UpdateLocationInstanceKeywordsCommandHandler(
    ICampaignUpdateRepository campaignRepository,
    IUserUpdateRepository userUpdateRepository) : IUpdateLocationInstanceKeywordsCommandHandler
{
    public async Task HandleAsync(UpdateLocationInstanceKeywordsCommand command)
    {
        var normalized = (command.Request.Keywords ?? [])
            .Select(k => k.Trim().ToLowerInvariant())
            .Where(k => k.Length > 0)
            .Distinct()
            .ToArray();

        await campaignRepository.UpdateLocationInstanceKeywordsAsync(command.InstanceId, normalized);
        await userUpdateRepository.MergeKeywordsAsync(command.DmUserId, normalized);
    }
}

public class UpdateLocationInstanceKeywordsCommand
{
    public UpdateLocationInstanceKeywordsCommand(Guid instanceId, Guid dmUserId, UpdateInstanceKeywordsRequest request)
    {
        InstanceId = instanceId;
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public Guid DmUserId { get; }
    public UpdateInstanceKeywordsRequest Request { get; }
}
