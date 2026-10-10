using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Cast;

public interface IUpsertFieldJournalEntryCommandHandler
{
    Task<PlayerFieldJournalEntryDomain> HandleAsync(UpsertFieldJournalEntryCommand command);
}

public class UpsertFieldJournalEntryCommandHandler(
    IPlayerFieldJournalEntryUpdateRepository updateRepository) : IUpsertFieldJournalEntryCommandHandler
{
    public async Task<PlayerFieldJournalEntryDomain> HandleAsync(UpsertFieldJournalEntryCommand command)
    {
        var cardKey = PlayerFieldJournalEntryDomain.CardKeyFor(
            command.Request.CastInstanceId, command.Request.SourceCastId);

        var domain = new PlayerFieldJournalEntryDomain
        {
            Id             = Guid.NewGuid(),
            CampaignId     = command.CampaignId,
            EncounterId    = command.Request.EncounterId,
            CardKey        = cardKey,
            CastInstanceId = command.Request.CastInstanceId,
            SourceCastId   = command.Request.SourceCastId,
            Notes          = command.Request.Notes ?? string.Empty,
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };

        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertFieldJournalEntryCommand
{
    public UpsertFieldJournalEntryCommand(Guid campaignId, UpsertPlayerFieldJournalEntryRequest request)
    {
        CampaignId = campaignId;
        Request    = request;
    }

    public Guid CampaignId { get; }
    public UpsertPlayerFieldJournalEntryRequest Request { get; }
}
