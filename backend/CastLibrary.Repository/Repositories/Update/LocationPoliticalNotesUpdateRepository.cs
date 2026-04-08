using System.Text.Json;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface ILocationPoliticalNotesUpdateRepository
{
    Task<LocationPoliticalNotesDomain> UpsertAsync(LocationPoliticalNotesDomain domain);
}

public class LocationPoliticalNotesUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation,
    ILocationPoliticalNotesEntityMapper mapper) : ILocationPoliticalNotesUpdateRepository
{
    public async Task<LocationPoliticalNotesDomain> UpsertAsync(LocationPoliticalNotesDomain domain)
    {
        var spanId  = correlation.NewSpan();
        var @params = new
        {
            domain.Id,
            domain.CampaignId,
            domain.LocationInstanceId,
            domain.GeneralNotes,
            Factions      = JsonSerializer.Serialize(domain.Factions),
            Relationships = JsonSerializer.Serialize(domain.Relationships),
            NpcRoles      = JsonSerializer.Serialize(domain.NpcRoles),
            domain.CreatedAt,
            domain.UpdatedAt,
        };

        const string sql =
            @"INSERT INTO location_political_notes
                (id, campaign_id, location_instance_id, general_notes, factions, relationships, npc_roles, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @LocationInstanceId, @GeneralNotes, @Factions, @Relationships, @NpcRoles, @CreatedAt, @UpdatedAt)
              ON CONFLICT (campaign_id, location_instance_id) DO UPDATE SET
                general_notes = EXCLUDED.general_notes,
                factions      = EXCLUDED.factions,
                relationships = EXCLUDED.relationships,
                npc_roles     = EXCLUDED.npc_roles,
                updated_at    = EXCLUDED.updated_at
              RETURNING id, campaign_id, location_instance_id, general_notes, factions, relationships, npc_roles, created_at, updated_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "location_political_notes", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var row = await conn.QueryFirstAsync<LocationPoliticalNotesEntity>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "location_political_notes", @params, 1);
        return mapper.ToDomain(row);
    }
}


