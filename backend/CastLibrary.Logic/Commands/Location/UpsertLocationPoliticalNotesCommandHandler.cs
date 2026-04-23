using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Location;

public interface IUpsertLocationPoliticalNotesCommandHandler
{
    Task<LocationPoliticalNotesDomain> HandleAsync(UpsertLocationPoliticalNotesCommand command);
}

public class UpsertLocationPoliticalNotesCommandHandler(
    ILocationPoliticalNotesReadRepository readRepository,
    ILocationPoliticalNotesUpdateRepository updateRepository) : IUpsertLocationPoliticalNotesCommandHandler
{
    public async Task<LocationPoliticalNotesDomain> HandleAsync(UpsertLocationPoliticalNotesCommand command)
    {
        var existing = await readRepository.GetByLocationInstanceAsync(command.CampaignId, command.LocationInstanceId);

        var domain = new LocationPoliticalNotesDomain
        {
            Id             = existing?.Id ?? Guid.NewGuid(),
            CampaignId     = command.CampaignId,
            LocationInstanceId = command.LocationInstanceId,
            GeneralNotes   = command.Request.GeneralNotes,
            Factions       = command.Request.Factions.Select(f => new LocationFactionDomain
            {
                Id        = f.Id,
                Name      = f.Name,
                Type      = f.Type,
                Influence = f.Influence,
                IsHidden  = f.IsHidden,
                SortOrder = f.SortOrder,
            }).ToList(),
            Relationships = command.Request.Relationships.Select(r => new LocationFactionRelationshipDomain
            {
                Id               = r.Id,
                FactionAId       = r.FactionAId,
                FactionBId       = r.FactionBId,
                RelationshipType = r.RelationshipType,
                Strength         = r.Strength,
                Notes            = r.Notes,
            }).ToList(),
            NpcRoles = command.Request.NpcRoles.Select(n => new LocationNpcRoleDomain
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

public class UpsertLocationPoliticalNotesCommand
{
    public UpsertLocationPoliticalNotesCommand(Guid campaignId, Guid locationInstanceId, UpsertLocationPoliticalNotesRequest request)
    {
        CampaignId = campaignId;
        LocationInstanceId = locationInstanceId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid LocationInstanceId { get; }
    public UpsertLocationPoliticalNotesRequest Request { get; }
}


