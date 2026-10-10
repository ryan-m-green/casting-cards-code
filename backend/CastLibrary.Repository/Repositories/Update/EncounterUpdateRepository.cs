using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Update;

public interface IEncounterUpdateRepository
{
    Task UpdateEncounterAsync(CampaignEncounterDomain encounter);
    Task EndOtherActiveEncountersAsync(Guid campaignId, Guid keepEncounterId);
    Task SetCurrentSpotAsync(Guid encounterId, Guid? spotId);
    Task SetEncounterRoundAsync(Guid encounterId, int roundNumber);
    Task IncrementSpotTurnsTakenAsync(Guid spotId);
    Task ResetSpotTurnsAsync(Guid encounterId);
    Task UpdateCombatantAsync(EncounterCombatantDomain combatant);
    Task UpdateSpotOrderAsync(Guid spotId, int initiativeOrder);
    Task UpdateSpotGroupNameAsync(Guid spotId, string groupName);

    /// <summary>
    /// Puts every spot of an encounter back to order 0, in one statement — where a fight's places
    /// start from before its order is set (see EndEncounterCommandHandler).
    /// </summary>
    Task ResetSpotOrdersAsync(Guid encounterId);

    /// <summary>
    /// Clears the rolled initiative numbers off every combatant row of an encounter, in one statement
    /// — the other half of putting a fight back to the start (see EndEncounterCommandHandler).
    /// </summary>
    Task ClearSpotInitiativeNumbersAsync(Guid encounterId);

    /// <summary>
    /// Clears the conditions a fight leaves behind as it ends: everything the party's own cards were
    /// carrying — a condition is for a fight, not for a sheet — and everything on a cast card that
    /// finished the fight down, taken or fled. A cast card still standing keeps what it carries.
    /// </summary>
    Task ClearEncounterConditionsAsync(Guid encounterId);

    /// <summary>Renames an encounter. False when the encounter no longer exists.</summary>
    Task<bool> UpdateEncounterNameAsync(Guid encounterId, string name);
    Task MoveCombatantToSpotAsync(Guid combatantId, Guid spotId);

    /// <summary>
    /// Writes the rolled initiative number onto every combatant row of the given
    /// spots in one statement (the number is duplicated across the group's rows).
    /// </summary>
    Task SetSpotInitiativeNumbersAsync(IReadOnlyList<(Guid SpotId, int InitiativeNumber)> numbers);
}

public class EncounterUpdateRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : IEncounterUpdateRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task UpdateEncounterAsync(CampaignEncounterDomain encounter)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            encounter.Id,
            encounter.Name,
            encounter.Status,
            encounter.CurrentSpotId,
            encounter.RoundNumber,
            encounter.EndedAt,
        };
        const string sql =
            @"UPDATE campaign_encounters
              SET name = @Name,
                  status = @Status,
                  current_spot_id = @CurrentSpotId,
                  round_number = @RoundNumber,
                  ended_at = @EndedAt,
                  updated_at = NOW()
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params, rows);
    }

    /// <summary>
    /// Ends every other active encounter of a campaign — the one fight at a time rule — doing the
    /// whole of what an end does: the encounter rows are ended, their spots go back to order 0 and the
    /// rolled numbers come off their combatant rows, so a fight pushed aside by a new one holds
    /// nothing from it, and the conditions the fight left on its cards are cleared with the rest.
    /// (The single-encounter end does the same things; keep the two in step.)
    ///
    /// The spots and combatants go first, while the encounters they belong to are still 'active' —
    /// that is the only thing pointing at them — and the encounters are flipped last.
    /// </summary>
    public async Task EndOtherActiveEncountersAsync(Guid campaignId, Guid keepEncounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, KeepEncounterId = keepEncounterId };

        const string spotsSql =
            @"UPDATE encounter_spots
              SET initiative_order = 0,
                  turns_taken = 0
              WHERE encounter_id IN (
                  SELECT id FROM campaign_encounters
                  WHERE campaign_id = @CampaignId AND id <> @KeepEncounterId AND status = 'active')";

        const string combatantsSql =
            @"UPDATE encounter_combatants
              SET initiative_number = NULL
              WHERE encounter_id IN (
                  SELECT id FROM campaign_encounters
                  WHERE campaign_id = @CampaignId AND id <> @KeepEncounterId AND status = 'active')";

        // What the pushed-aside fights left on their cards goes with them: a party member's own cards
        // shed every condition, a cast card that finished down, taken or fled, sheds what it carried.
        // This runs while those encounters are still 'active', which is what points at their rows.
        const string shedCombatantConditionsSql =
            @"DELETE FROM encounter_combatant_conditions
              WHERE encounter_combatant_id IN (
                  SELECT c.id
                  FROM encounter_combatants c
                  JOIN campaign_encounters e ON e.id = c.encounter_id
                  WHERE e.campaign_id = @CampaignId
                    AND e.id <> @KeepEncounterId
                    AND e.status = 'active'
                    AND (c.is_defeated OR c.is_captured OR c.is_escaped))";

        const string partyConditionsSql =
            @"DELETE FROM player_card_conditions
              WHERE player_card_id IN (
                  SELECT c.player_card_id
                  FROM encounter_combatants c
                  JOIN campaign_encounters e ON e.id = c.encounter_id
                  WHERE e.campaign_id = @CampaignId
                    AND e.id <> @KeepEncounterId
                    AND e.status = 'active'
                    AND c.player_card_id IS NOT NULL)";

        const string encountersSql =
            @"UPDATE campaign_encounters
              SET status = 'ended',
                  ended_at = NOW(),
                  current_spot_id = NULL,
                  round_number = 0,
                  updated_at = NOW()
              WHERE campaign_id = @CampaignId AND id <> @KeepEncounterId AND status = 'active'";

        using var conn = CreateConnection();

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params);
        var spots = await conn.ExecuteAsync(spotsSql, @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params, spots);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params);
        var combatants = await conn.ExecuteAsync(combatantsSql, @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params, combatants);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params);
        var shed = await conn.ExecuteAsync(shedCombatantConditionsSql, @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params, shed);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_conditions", @params);
        var party = await conn.ExecuteAsync(partyConditionsSql, @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_conditions", @params, party);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params);
        var rows = await conn.ExecuteAsync(encountersSql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params, rows);
    }

    public async Task SetCurrentSpotAsync(Guid encounterId, Guid? spotId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId, SpotId = spotId };
        const string sql =
            @"UPDATE campaign_encounters
              SET current_spot_id = @SpotId, updated_at = NOW()
              WHERE id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params, rows);
    }

    public async Task UpdateCombatantAsync(EncounterCombatantDomain combatant)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            combatant.Id,
            combatant.MaxHitPoints,
            combatant.LostHitPoints,
            combatant.TempHitPoints,
            combatant.IsDefeated,
            combatant.IsCaptured,
            combatant.IsEscaped,
            combatant.Notes,
        };
        const string sql =
            @"UPDATE encounter_combatants
              SET max_hit_points = @MaxHitPoints,
                  lost_hit_points = @LostHitPoints,
                  temp_hit_points = @TempHitPoints,
                  is_defeated = @IsDefeated,
                  is_captured = @IsCaptured,
                  is_escaped = @IsEscaped,
                  notes = @Notes,
                  -- A card put back on its feet forgets the fall the party was given a trophy for, so a
                  -- later fall is a new defeat and is counted again (see
                  -- IEncounterInsertRepository.CaptureEncounterTrophiesAsync).
                  trophy_captured_at = CASE WHEN @IsDefeated THEN trophy_captured_at ELSE NULL END
              WHERE id = @Id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params, rows);
    }

    public async Task UpdateSpotOrderAsync(Guid spotId, int initiativeOrder)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SpotId = spotId, InitiativeOrder = initiativeOrder };
        const string sql =
            @"UPDATE encounter_spots SET initiative_order = @InitiativeOrder WHERE id = @SpotId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params, rows);
    }

    /// <summary>Puts every spot of an encounter back to order 0, in one statement.</summary>
    public async Task ResetSpotOrdersAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };
        const string sql =
            @"UPDATE encounter_spots SET initiative_order = 0 WHERE encounter_id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params, rows);
    }

    /// <summary>Clears the rolled initiative numbers off an encounter's combatant rows.</summary>
    public async Task ClearSpotInitiativeNumbersAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };
        const string sql =
            @"UPDATE encounter_combatants SET initiative_number = NULL WHERE encounter_id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params, rows);
    }

    /// <summary>
    /// Clears the conditions a fight leaves behind as it ends: everything the party's own cards were
    /// carrying — a condition is for a fight, not for a sheet — and everything on a cast card that
    /// finished the fight down, taken or fled. A cast card still standing keeps what it carries.
    /// </summary>
    public async Task ClearEncounterConditionsAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };

        const string combatantConditionsSql =
            @"DELETE FROM encounter_combatant_conditions
              WHERE encounter_combatant_id IN (
                  SELECT c.id FROM encounter_combatants c
                  WHERE c.encounter_id = @EncounterId
                    AND (c.is_defeated OR c.is_captured OR c.is_escaped))";

        const string playerConditionsSql =
            @"DELETE FROM player_card_conditions
              WHERE player_card_id IN (
                  SELECT c.player_card_id FROM encounter_combatants c
                  WHERE c.encounter_id = @EncounterId AND c.player_card_id IS NOT NULL)";

        using var conn = CreateConnection();

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params);
        var shed = await conn.ExecuteAsync(combatantConditionsSql, @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "encounter_combatant_conditions", @params, shed);

        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_conditions", @params);
        var party = await conn.ExecuteAsync(playerConditionsSql, @params);
        logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "player_card_conditions", @params, party);
    }

    public async Task UpdateSpotGroupNameAsync(Guid spotId, string groupName)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SpotId = spotId, GroupName = groupName };
        const string sql =
            @"UPDATE encounter_spots SET group_name = @GroupName WHERE id = @SpotId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params, rows);
    }

    public async Task<bool> UpdateEncounterNameAsync(Guid encounterId, string name)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId, Name = name };
        const string sql =
            @"UPDATE campaign_encounters
              SET name = @Name, updated_at = NOW()
              WHERE id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params, rows);
        return rows > 0;
    }

    public async Task MoveCombatantToSpotAsync(Guid combatantId, Guid spotId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CombatantId = combatantId, SpotId = spotId };
        const string sql =
            @"UPDATE encounter_combatants SET spot_id = @SpotId WHERE id = @CombatantId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params, rows);
    }

    /// <summary>
    /// Duplicates each spot's rolled initiative number onto every combatant row
    /// of that spot, in a single statement (one round trip per commit).
    /// </summary>
    public async Task SetSpotInitiativeNumbersAsync(IReadOnlyList<(Guid SpotId, int InitiativeNumber)> numbers)
    {
        if (numbers.Count == 0) return;

        var spanId = correlation.NewSpan();
        var @params = new
        {
            SpotIds = numbers.Select(n => n.SpotId).ToArray(),
            Numbers = numbers.Select(n => n.InitiativeNumber).ToArray(),
        };
        const string sql =
            @"UPDATE encounter_combatants c
              SET initiative_number = v.number
              FROM (SELECT unnest(@SpotIds::uuid[]) AS spot_id,
                           unnest(@Numbers::int[])  AS number) v
              WHERE c.spot_id = v.spot_id";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_combatants", @params, rows);
    }

    public async Task SetEncounterRoundAsync(Guid encounterId, int roundNumber)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId, RoundNumber = roundNumber };
        const string sql =
            @"UPDATE campaign_encounters
              SET round_number = @RoundNumber, updated_at = NOW()
              WHERE id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_encounters", @params, rows);
    }

    public async Task IncrementSpotTurnsTakenAsync(Guid spotId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SpotId = spotId };
        const string sql =
            @"UPDATE encounter_spots SET turns_taken = turns_taken + 1 WHERE id = @SpotId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params, rows);
    }

    public async Task ResetSpotTurnsAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };
        const string sql =
            @"UPDATE encounter_spots SET turns_taken = 0 WHERE encounter_id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "encounter_spots", @params, rows);
    }
}
