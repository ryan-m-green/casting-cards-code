using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.City;

public interface IUpsertCityPoliticalNotesCommandHandler
{
    Task<CityPoliticalNotesDomain> HandleAsync(UpsertCityPoliticalNotesCommand command);
}

public class UpsertCityPoliticalNotesCommandHandler(
    ICityPoliticalNotesReadRepository readRepository,
    ICityPoliticalNotesUpdateRepository updateRepository) : IUpsertCityPoliticalNotesCommandHandler
{
    public async Task<CityPoliticalNotesDomain> HandleAsync(UpsertCityPoliticalNotesCommand command)
    {
        var existing = await readRepository.GetByCityInstanceAsync(command.CampaignId, command.CityInstanceId);

        var domain = new CityPoliticalNotesDomain
        {
            Id             = existing?.Id ?? Guid.NewGuid(),
            CampaignId     = command.CampaignId,
            CityInstanceId = command.CityInstanceId,
            GeneralNotes   = command.Request.GeneralNotes,
            Factions       = command.Request.Factions.Select(f => new CityFactionDomain
            {
                Id        = f.Id,
                Name      = f.Name,
                Type      = f.Type,
                Influence = f.Influence,
                IsHidden  = f.IsHidden,
                SortOrder = f.SortOrder,
            }).ToList(),
            Relationships = command.Request.Relationships.Select(r => new CityFactionRelationshipDomain
            {
                Id               = r.Id,
                FactionAId       = r.FactionAId,
                FactionBId       = r.FactionBId,
                RelationshipType = r.RelationshipType,
                Strength         = r.Strength,
                Notes            = r.Notes,
            }).ToList(),
            NpcRoles = command.Request.NpcRoles.Select(n => new CityNpcRoleDomain
            {
                Id             = n.Id,
                CastInstanceId = n.CastInstanceId,
                FactionId      = n.FactionId,
                Role           = n.Role,
                Motivation     = n.Motivation,
            }).ToList(),
            CreatedAt = existing?.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return await updateRepository.UpsertAsync(domain);
    }
}

public class UpsertCityPoliticalNotesCommand
{
    public UpsertCityPoliticalNotesCommand(Guid campaignId, Guid cityInstanceId, UpsertCityPoliticalNotesRequest request)
    {
        CampaignId = campaignId;
        CityInstanceId = cityInstanceId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid CityInstanceId { get; }
    public UpsertCityPoliticalNotesRequest Request { get; }
}
