using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPlayerFieldJournalEntryEntityMapper
{
    PlayerFieldJournalEntryDomain ToDomain(PlayerFieldJournalEntryEntity entity);
    PlayerFieldJournalEntryEntity ToEntity(PlayerFieldJournalEntryDomain domain);
}

public class PlayerFieldJournalEntryEntityMapper : IPlayerFieldJournalEntryEntityMapper
{
    public PlayerFieldJournalEntryDomain ToDomain(PlayerFieldJournalEntryEntity entity) => new()
    {
        Id             = entity.Id,
        CampaignId     = entity.CampaignId,
        EncounterId    = entity.EncounterId,
        CardKey        = entity.CardKey ?? string.Empty,
        CastInstanceId = entity.CastInstanceId,
        SourceCastId   = entity.SourceCastId,
        Notes          = entity.Notes ?? string.Empty,
        CreatedAt      = entity.CreatedAt,
        UpdatedAt      = entity.UpdatedAt,
    };

    public PlayerFieldJournalEntryEntity ToEntity(PlayerFieldJournalEntryDomain domain) => new()
    {
        Id             = domain.Id,
        CampaignId     = domain.CampaignId,
        EncounterId    = domain.EncounterId,
        CardKey        = domain.CardKey,
        CastInstanceId = domain.CastInstanceId,
        SourceCastId   = domain.SourceCastId,
        Notes          = domain.Notes,
        CreatedAt      = domain.CreatedAt,
        UpdatedAt      = domain.UpdatedAt,
    };
}
