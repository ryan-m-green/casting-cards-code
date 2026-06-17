using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Faction;

public interface ICreateFactionCommandHandler
{
    Task<FactionDomain> HandleAsync(CreateFactionCommand command);
}

public class CreateFactionCommandHandler(
    IFactionInsertRepository factionRepository,
    IFactionFactory factionFactory,
    ISubscriptionLimitService subscriptionLimitService) : ICreateFactionCommandHandler
{
    public async Task<FactionDomain> HandleAsync(CreateFactionCommand command)
    {
        await subscriptionLimitService.CheckLimitAsync(command.DmUserId, "Faction");
        
        var domain = factionFactory.Create(command.Request, command.DmUserId);
        return await factionRepository.InsertAsync(domain);
    }
}

public class CreateFactionCommand
{
    public CreateFactionCommand(Guid dmUserId, CreateFactionRequest request)
    {
        DmUserId = dmUserId;
        Request  = request;
    }

    public Guid DmUserId { get; }
    public CreateFactionRequest Request { get; }
}
