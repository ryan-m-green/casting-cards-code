using System.Text.Json;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAssignFactionToCastCommandHandler
{
    Task HandleAsync(AssignFactionToCastCommand command);
}

public class AssignFactionToCastCommandHandler(
    ICampaignUpdateRepository campaignUpdateRepository) : IAssignFactionToCastCommandHandler
{
    public async Task HandleAsync(AssignFactionToCastCommand command)
    {
        var symbols = command.Request.FactionSymbols
            .Select(s => new FactionSymbolDomain(s.FactionInstanceId, s.SymbolPath))
            .ToList();

        var json = JsonSerializer.Serialize(symbols);

        if (command.Request.DmUserId.HasValue)
        {
            await campaignUpdateRepository.UpdateCastFactionSymbolsAsync(command.InstanceId, json);
        }
        else
        {
            var factionIds = command.Request.FactionSymbols
                .Select(s => Guid.Parse(s.FactionInstanceId))
                .ToList();

            await campaignUpdateRepository.UpdateCastPlayerFactionSymbolsAsync(command.InstanceId, json);
            await campaignUpdateRepository.SyncPlayerFactionCastMembershipsAsync(command.InstanceId, factionIds);
        }
    }
}

public class AssignFactionToCastCommand
{
    public AssignFactionToCastCommand(Guid instanceId, AssignFactionToCastRequest request)
    {
        InstanceId = instanceId;
        Request = request;
    }

    public Guid InstanceId { get; }
    public AssignFactionToCastRequest Request { get; }
}
