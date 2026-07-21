using System.Text.Json;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface ICampaignFactionInstanceEntityMapper
{
    CampaignFactionInstanceDomain ToDomain(CampaignFactionInstanceEntity entity);
    CampaignFactionInstanceEntity ToEntity(CampaignFactionInstanceDomain domain);
}

public class CampaignFactionInstanceEntityMapper : ICampaignFactionInstanceEntityMapper
{
    public CampaignFactionInstanceDomain ToDomain(CampaignFactionInstanceEntity entity) => new()
    {
        FactionInstanceId   = entity.FactionInstanceId,
        SourceFactionId     = entity.SourceFactionId,
        CampaignId          = entity.CampaignId,
        DmUserId            = entity.DmUserId,
        Name                = entity.Name,
        Type                = entity.Type,
        Influence           = entity.Influence,
        Perception          = entity.Perception,
        Hidden              = entity.Hidden,
        IsVisibleToPlayers  = entity.IsVisibleToPlayers,
        Description         = entity.Description,
        DmNotes             = entity.DmNotes,
        SymbolPath              = entity.SymbolPath,
        Colors                 = string.IsNullOrWhiteSpace(entity.Colors)
            ? new FactionColors()
            : JsonSerializer.Deserialize<FactionColors>(entity.Colors) ?? new FactionColors(),
        CreatedAt               = entity.CreatedAt,
        SubLocationInstanceIds  = entity.SubLocationInstanceIds,
        CastInstanceIds         = entity.CastInstanceIds,
    };

    public CampaignFactionInstanceEntity ToEntity(CampaignFactionInstanceDomain domain) => new()
    {
        FactionInstanceId   = domain.FactionInstanceId,
        SourceFactionId     = domain.SourceFactionId,
        CampaignId          = domain.CampaignId,
        DmUserId            = domain.DmUserId,
        Name                = domain.Name,
        Type                = domain.Type,
        Influence           = domain.Influence,
        Perception          = domain.Perception,
        Hidden              = domain.Hidden,
        IsVisibleToPlayers  = domain.IsVisibleToPlayers,
        Description         = domain.Description,
        DmNotes             = domain.DmNotes,
        SymbolPath              = domain.SymbolPath,
        Colors                 = JsonSerializer.Serialize(domain.Colors),
        CreatedAt               = domain.CreatedAt,
        SubLocationInstanceIds  = domain.SubLocationInstanceIds,
        CastInstanceIds         = domain.CastInstanceIds,
    };
}
