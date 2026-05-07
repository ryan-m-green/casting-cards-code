using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignFactionPlayerNotesEntityMapper
{
    CampaignFactionPlayerNotesDomain ToDomain(CampaignFactionPlayerNotesEntity entity);
    CampaignFactionPlayerNotesEntity ToEntity(CampaignFactionPlayerNotesDomain domain);
}

public class CampaignFactionPlayerNotesEntityMapper : ICampaignFactionPlayerNotesEntityMapper
{
    public CampaignFactionPlayerNotesDomain ToDomain(CampaignFactionPlayerNotesEntity entity) => new()
    {
        Id                = entity.Id,
        CampaignId        = entity.CampaignId,
        FactionInstanceId = entity.FactionInstanceId,
        Notes             = entity.Notes ?? string.Empty,
        Influence         = entity.Influence,
        Perception        = entity.Perception,
        CreatedAt         = entity.CreatedAt,
        UpdatedAt         = entity.UpdatedAt,
    };

    public CampaignFactionPlayerNotesEntity ToEntity(CampaignFactionPlayerNotesDomain domain) => new()
    {
        Id                = domain.Id,
        CampaignId        = domain.CampaignId,
        FactionInstanceId = domain.FactionInstanceId,
        Notes             = domain.Notes,
        Influence         = domain.Influence,
        Perception        = domain.Perception,
        CreatedAt         = domain.CreatedAt,
        UpdatedAt         = domain.UpdatedAt,
    };
}
