using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IEncounterInsertRepository
{
    Task<CampaignEncounterDomain> InsertEncounterAsync(CampaignEncounterDomain encounter);
    Task<EncounterSpotDomain> InsertSpotAsync(EncounterSpotDomain spot);
    Task<EncounterCombatantDomain> InsertCombatantAsync(EncounterCombatantDomain combatant);

    /// <summary>
    /// Counts the cast cards of an encounter that have fallen and have not been counted yet, adds them
    /// to the campaign's trophies — one tally per distinct cast, so a fight that put three of the same
    /// card down counts three against the one row — and stamps those rows as counted. The whole of it
    /// is one statement, so a fall is either counted and stamped or neither (see
    /// EndEncounterCommandHandler).
    /// </summary>
    Task<EncounterTrophyCaptureDomain> CaptureEncounterTrophiesAsync(Guid campaignId, Guid encounterId);
}

public class EncounterInsertRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : IEncounterInsertRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<CampaignEncounterDomain> InsertEncounterAsync(CampaignEncounterDomain encounter)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            encounter.Id,
            encounter.CampaignId,
            encounter.SequenceNumber,
            encounter.Name,
            encounter.Status,
        };
        const string sql =
            @"INSERT INTO campaign_encounters
                (id, campaign_id, sequence_number, name, status, created_at, updated_at)
              VALUES
                (@Id, @CampaignId, @SequenceNumber, @Name, @Status, NOW(), NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_encounters", @params, rows);
        return encounter;
    }

    public async Task<EncounterSpotDomain> InsertSpotAsync(EncounterSpotDomain spot)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            spot.Id,
            spot.EncounterId,
            spot.InitiativeOrder,
            spot.GroupName,
        };
        const string sql =
            @"INSERT INTO encounter_spots
                (id, encounter_id, initiative_order, group_name, created_at)
              VALUES
                (@Id, @EncounterId, @InitiativeOrder, @GroupName, NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "encounter_spots", @params, rows);
        return spot;
    }

    public async Task<EncounterCombatantDomain> InsertCombatantAsync(EncounterCombatantDomain combatant)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            combatant.Id,
            combatant.SpotId,
            combatant.EncounterId,
            combatant.CombatantType,
            combatant.SourceCastId,
            combatant.PlayerCardId,
            combatant.OriginCampaignCastInstanceId,
            combatant.DisplayName,
            combatant.ImageUrl,
            combatant.MaxHitPoints,
            combatant.LostHitPoints,
            combatant.TempHitPoints,
            combatant.IsDefeated,
            combatant.IsCaptured,
            combatant.IsEscaped,
            combatant.InitiativeNumber,
        };
        const string sql =
            @"INSERT INTO encounter_combatants
                (id, spot_id, encounter_id, combatant_type, source_cast_id, player_card_id,
                 origin_campaign_cast_instance_id, display_name, image_url,
                 max_hit_points, lost_hit_points, temp_hit_points, is_defeated,
                 is_captured, is_escaped, initiative_number, created_at)
              VALUES
                (@Id, @SpotId, @EncounterId, @CombatantType, @SourceCastId, @PlayerCardId,
                 @OriginCampaignCastInstanceId, @DisplayName, @ImageUrl,
                 @MaxHitPoints, @LostHitPoints, @TempHitPoints, @IsDefeated,
                 @IsCaptured, @IsEscaped, @InitiativeNumber, NOW())";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "encounter_combatants", @params, rows);
        return combatant;
    }

    public async Task<EncounterTrophyCaptureDomain> CaptureEncounterTrophiesAsync(Guid campaignId, Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, EncounterId = encounterId };

        // The count per cast, the tally written from it and the stamp that says the fall has been
        // counted, all in one statement: a fall cannot be counted without being stamped, so neither a
        // second ending of the same fight nor a fall already counted as it happened can be added
        // twice. The UPDATE stamps exactly the rows the count was taken from — both read the same
        // `fallen` rows of the same snapshot — and a card that is put back on its feet loses its
        // stamp as it is written (see EncounterUpdateRepository.UpdateCombatantAsync), so a later fall
        // is a new defeat.
        const string sql =
            @"WITH fallen AS (
                  SELECT c.id, c.source_cast_id
                  FROM encounter_combatants c
                  WHERE c.encounter_id = @EncounterId
                    AND c.combatant_type = 'cast'
                    AND c.is_defeated
                    AND c.source_cast_id IS NOT NULL
                    AND c.trophy_captured_at IS NULL
              ),
              counted AS (
                  SELECT source_cast_id, COUNT(*)::int AS fallen_count
                  FROM fallen
                  GROUP BY source_cast_id
              ),
              awarded AS (
                  INSERT INTO campaign_trophies
                      (id, campaign_id, source_cast_id, defeated_count, first_defeated_at)
                  SELECT gen_random_uuid(), @CampaignId, source_cast_id, fallen_count, NOW()
                  FROM counted
                  ON CONFLICT (campaign_id, source_cast_id)
                  DO UPDATE SET defeated_count = campaign_trophies.defeated_count + EXCLUDED.defeated_count
                  RETURNING 1
              ),
              stamped AS (
                  UPDATE encounter_combatants
                  SET trophy_captured_at = NOW()
                  WHERE id IN (SELECT id FROM fallen)
                  RETURNING 1
              )
              SELECT (SELECT COUNT(*)::int FROM awarded) AS Trophies,
                     (SELECT COUNT(*)::int FROM stamped) AS Combatants";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_trophies", @params);

        using var conn = CreateConnection();
        var captured = await conn.QuerySingleAsync<EncounterTrophyCaptureDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_trophies", @params, captured.Trophies);
        return captured;
    }
}
