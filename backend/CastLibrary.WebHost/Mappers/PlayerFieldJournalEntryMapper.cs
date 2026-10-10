using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface IPlayerFieldJournalEntryMapper
{
    PlayerFieldJournalEntryResponse ToResponse(PlayerFieldJournalEntryDomain domain);
}

public class PlayerFieldJournalEntryMapper : IPlayerFieldJournalEntryMapper
{
    public PlayerFieldJournalEntryResponse ToResponse(PlayerFieldJournalEntryDomain domain) => new()
    {
        Id             = domain.Id,
        CampaignId     = domain.CampaignId,
        EncounterId    = domain.EncounterId,
        CardKey        = domain.CardKey,
        CastInstanceId = domain.CastInstanceId,
        SourceCastId   = domain.SourceCastId,
        Notes          = domain.Notes,
        UpdatedAt      = domain.UpdatedAt,
    };
}
