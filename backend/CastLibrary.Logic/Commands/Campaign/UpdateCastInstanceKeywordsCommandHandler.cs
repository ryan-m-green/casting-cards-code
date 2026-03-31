using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateCastInstanceKeywordsCommandHandler
{
    Task HandleAsync(UpdateCastInstanceKeywordsCommand command);
}

public class UpdateCastInstanceKeywordsCommandHandler(
    ICampaignUpdateRepository campaignRepository,
    IUserUpdateRepository userUpdateRepository) : IUpdateCastInstanceKeywordsCommandHandler
{
    public async Task HandleAsync(UpdateCastInstanceKeywordsCommand command)
    {
        var normalized = (command.Request.Keywords ?? [])
            .Select(k => k.Trim().ToLowerInvariant())
            .Where(k => k.Length > 0)
            .Distinct()
            .ToArray();

        await campaignRepository.UpdateCastInstanceKeywordsAsync(command.InstanceId, normalized);
        await userUpdateRepository.MergeKeywordsAsync(command.DmUserId, normalized);
    }
}

public class UpdateCastInstanceKeywordsCommand
{
    public UpdateCastInstanceKeywordsCommand(Guid instanceId, Guid dmUserId, UpdateInstanceKeywordsRequest request)
    {
        InstanceId = instanceId;
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public Guid DmUserId { get; }
    public UpdateInstanceKeywordsRequest Request { get; }
}
