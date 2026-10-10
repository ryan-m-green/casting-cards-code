using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Cast;

public interface ICreateCastCommandHandler
{
    Task<CastDomain> HandleAsync(CreateCastCommand command);
}
public class CreateCastCommandHandler(
    ICastInsertRepository castRepository,
    ICastFactory castFactory,
    ISubscriptionLimitService subscriptionLimitService,
    ICampaignKeywordInsertRepository campaignKeywordInsertRepository) : ICreateCastCommandHandler
{
    public async Task<CastDomain> HandleAsync(CreateCastCommand command)
    {
        await subscriptionLimitService.CheckLimitAsync(command.DmUserId, "Cast");
        
        var domain = castFactory.Create(command.Request, command.DmUserId);
        var result = await castRepository.InsertAsync(domain);
        await campaignKeywordInsertRepository.MergeKeywordsAsync(command.DmUserId, "cast", domain.Keywords);
        return result;
    }
}

public class CreateCastCommand
{
    public CreateCastCommand(Guid dmUserId, CreateCastRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateCastRequest Request { get; }
}
