using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Read;

public interface IEncounterReadRepository
{
    Task<List<CampaignEncounterDomain>> GetEncountersByCampaignAsync(Guid campaignId);
    Task<CampaignEncounterDomain> GetEncounterByIdAsync(Guid encounterId);
    Task<CampaignEncounterDomain> GetActiveEncounterAsync(Guid campaignId);
    Task<EncounterSpotDomain> GetSpotByIdAsync(Guid spotId);
    Task<EncounterCombatantDomain> GetCombatantByIdAsync(Guid combatantId);
    Task<List<EncounterCombatantDomain>> GetCombatantsByEncounterAsync(Guid encounterId);
    Task<List<CampaignTrophyDomain>> GetTrophiesByCampaignAsync(Guid campaignId);
}

public class EncounterReadRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : IEncounterReadRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    /// <summary>Spot columns, qualified for the queries that join through encounters.</summary>
    private const string SpotColumns =
        @"s.id               AS Id,
          s.encounter_id     AS EncounterId,
          s.initiative_order AS InitiativeOrder,
          s.group_name       AS GroupName,
          s.turns_taken      AS TurnsTaken,
          s.created_at       AS CreatedAt";

    /// <summary>Combatant columns, qualified for the queries that join through spots.</summary>
    private const string CombatantColumns =
        @"c.id                               AS Id,
          c.spot_id                          AS SpotId,
          c.encounter_id                     AS EncounterId,
          c.combatant_type                   AS CombatantType,
          c.source_cast_id                   AS SourceCastId,
          c.player_card_id                   AS PlayerCardId,
          c.origin_campaign_cast_instance_id AS OriginCampaignCastInstanceId,
          c.display_name                     AS DisplayName,
          c.image_url                        AS ImageUrl,
          c.max_hit_points                   AS MaxHitPoints,
          c.lost_hit_points                  AS LostHitPoints,
          c.temp_hit_points                  AS TempHitPoints,
          c.is_defeated                      AS IsDefeated,
          c.is_captured                      AS IsCaptured,
          c.is_escaped                       AS IsEscaped,
          c.notes                            AS Notes,
          c.initiative_number                AS InitiativeNumber,
          c.created_at                       AS CreatedAt";

    /// <summary>Groups combatant rows under the spot they belong to.</summary>
    private static void AttachCombatants(
        List<EncounterSpotDomain> spots, List<EncounterCombatantDomain> combatants)
    {
        var bySpot = combatants.GroupBy(c => c.SpotId).ToDictionary(g => g.Key, g => g.ToList());
        foreach (var spot in spots)
        {
            spot.Combatants = bySpot.TryGetValue(spot.Id, out var list) ? list : [];
        }
    }

    /// <summary>
    /// Reads a campaign's spots and combatants in two queries and hangs them on the
    /// encounters, so the encounter list carries the same objects the detail read
    /// returns. (Two queries for the whole campaign, not one per encounter.)
    /// </summary>
    private async Task AttachSpotsAsync(
        NpgsqlConnection conn, List<CampaignEncounterDomain> encounters, Guid campaignId)
    {
        if (encounters.Count == 0) return;

        var @params = new { CampaignId = campaignId };
        var spotSql =
            $@"SELECT {SpotColumns}
               FROM encounter_spots s
               JOIN campaign_encounters e ON e.id = s.encounter_id
               WHERE e.campaign_id = @CampaignId
               ORDER BY s.initiative_order, s.created_at";

        var combatantSql =
            $@"SELECT {CombatantColumns}
               FROM encounter_combatants c
               JOIN encounter_spots s ON s.id = c.spot_id
               JOIN campaign_encounters e ON e.id = s.encounter_id
               WHERE e.campaign_id = @CampaignId
               ORDER BY c.created_at";

        var spots = (await conn.QueryAsync<EncounterSpotDomain>(spotSql, @params)).ToList();
        var combatants = (await conn.QueryAsync<EncounterCombatantDomain>(combatantSql, @params)).ToList();

        AttachCombatants(spots, combatants);
        await AttachConditionsAsync(conn, combatants);

        var byEncounter = spots.GroupBy(s => s.EncounterId).ToDictionary(g => g.Key, g => g.ToList());
        foreach (var encounter in encounters)
        {
            encounter.Spots = byEncounter.TryGetValue(encounter.Id, out var list) ? list : [];
        }
    }

    public async Task<List<CampaignEncounterDomain>> GetEncountersByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id              AS Id,
                     campaign_id     AS CampaignId,
                     sequence_number AS SequenceNumber,
                     name,
                     status,
                     current_spot_id AS CurrentSpotId,
                     round_number    AS RoundNumber,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt,
                     ended_at        AS EndedAt
              FROM campaign_encounters
              WHERE campaign_id = @CampaignId
              ORDER BY created_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var records = (await conn.QueryAsync<CampaignEncounterDomain>(sql, @params)).ToList();

        // Each encounter is returned with its spots and combatants, to the same
        // shape the detail read returns — the encounter cards count what an
        // encounter actually holds rather than a separate tally.
        await AttachSpotsAsync(conn, records, campaignId);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_encounters", @params, records.Count);
        return records;
    }

    public async Task<CampaignEncounterDomain> GetEncounterByIdAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };
        const string sql =
            @"SELECT id              AS Id,
                     campaign_id     AS CampaignId,
                     sequence_number AS SequenceNumber,
                     name,
                     status,
                     current_spot_id AS CurrentSpotId,
                     round_number    AS RoundNumber,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt,
                     ended_at        AS EndedAt
              FROM campaign_encounters
              WHERE id = @EncounterId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var encounter = await conn.QueryFirstOrDefaultAsync<CampaignEncounterDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_encounters", @params, encounter is null ? 0 : 1);
        if (encounter is null) return null;

        encounter.Spots = await GetSpotsWithCombatantsAsync(conn, encounterId);
        return encounter;
    }

    public async Task<CampaignEncounterDomain> GetActiveEncounterAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT id              AS Id,
                     campaign_id     AS CampaignId,
                     sequence_number AS SequenceNumber,
                     name,
                     status,
                     current_spot_id AS CurrentSpotId,
                     round_number    AS RoundNumber,
                     created_at      AS CreatedAt,
                     updated_at      AS UpdatedAt,
                     ended_at        AS EndedAt
              FROM campaign_encounters
              WHERE campaign_id = @CampaignId AND status = 'active'
              ORDER BY created_at DESC
              LIMIT 1";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_encounters", @params);

        using var conn = CreateConnection();
        var encounter = await conn.QueryFirstOrDefaultAsync<CampaignEncounterDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_encounters", @params, encounter is null ? 0 : 1);
        if (encounter is null) return null;

        encounter.Spots = await GetSpotsWithCombatantsAsync(conn, encounter.Id);
        return encounter;
    }

    public async Task<EncounterSpotDomain> GetSpotByIdAsync(Guid spotId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { SpotId = spotId };
        const string sql =
            @"SELECT id               AS Id,
                     encounter_id     AS EncounterId,
                     initiative_order AS InitiativeOrder,
                     group_name       AS GroupName,
                     turns_taken      AS TurnsTaken,
                     created_at       AS CreatedAt
              FROM encounter_spots
              WHERE id = @SpotId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_spots", @params);

        using var conn = CreateConnection();
        var record = await conn.QueryFirstOrDefaultAsync<EncounterSpotDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_spots", @params, record is null ? 0 : 1);
        return record;
    }

    public async Task<EncounterCombatantDomain> GetCombatantByIdAsync(Guid combatantId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CombatantId = combatantId };
        const string sql =
            @"SELECT id                               AS Id,
                     spot_id                          AS SpotId,
                     encounter_id                     AS EncounterId,
                     combatant_type                   AS CombatantType,
                     source_cast_id                   AS SourceCastId,
                     player_card_id                   AS PlayerCardId,
                     origin_campaign_cast_instance_id AS OriginCampaignCastInstanceId,
                     display_name                     AS DisplayName,
                     image_url                        AS ImageUrl,
                     max_hit_points                   AS MaxHitPoints,
                     lost_hit_points                  AS LostHitPoints,
                     temp_hit_points                  AS TempHitPoints,
                     is_defeated                      AS IsDefeated,
                     is_captured                      AS IsCaptured,
                     is_escaped                       AS IsEscaped,
                     initiative_number                AS InitiativeNumber,
                     created_at                       AS CreatedAt
              FROM encounter_combatants
              WHERE id = @CombatantId";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var record = await conn.QueryFirstOrDefaultAsync<EncounterCombatantDomain>(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_combatants", @params, record is null ? 0 : 1);
        return record;
    }

    public async Task<List<EncounterCombatantDomain>> GetCombatantsByEncounterAsync(Guid encounterId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { EncounterId = encounterId };
        const string sql =
            @"SELECT id                               AS Id,
                     spot_id                          AS SpotId,
                     encounter_id                     AS EncounterId,
                     combatant_type                   AS CombatantType,
                     source_cast_id                   AS SourceCastId,
                     player_card_id                   AS PlayerCardId,
                     origin_campaign_cast_instance_id AS OriginCampaignCastInstanceId,
                     display_name                     AS DisplayName,
                     image_url                        AS ImageUrl,
                     max_hit_points                   AS MaxHitPoints,
                     lost_hit_points                  AS LostHitPoints,
                     temp_hit_points                  AS TempHitPoints,
                     is_defeated                      AS IsDefeated,
                     is_captured                      AS IsCaptured,
                     is_escaped                       AS IsEscaped,
                     initiative_number                AS InitiativeNumber,
                     created_at                       AS CreatedAt
              FROM encounter_combatants
              WHERE encounter_id = @EncounterId
              ORDER BY created_at";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_combatants", @params);

        using var conn = CreateConnection();
        var records = (await conn.QueryAsync<EncounterCombatantDomain>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "encounter_combatants", @params, records.Count);
        return records;
    }

    public async Task<List<CampaignTrophyDomain>> GetTrophiesByCampaignAsync(Guid campaignId)
    {
        var spanId = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };
        const string sql =
            @"SELECT t.id                AS Id,
                     t.campaign_id       AS CampaignId,
                     t.source_cast_id    AS SourceCastId,
                     t.defeated_count    AS DefeatedCount,
                     t.first_defeated_at AS FirstDefeatedAt,
                     t.notes             AS Notes,
                     c.name              AS Name,
                     c.dm_user_id        AS DmUserId
              FROM campaign_trophies t
              JOIN casts c ON c.id = t.source_cast_id
              WHERE t.campaign_id = @CampaignId
              ORDER BY t.first_defeated_at DESC";

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_trophies", @params);

        using var conn = CreateConnection();
        var records = (await conn.QueryAsync<CampaignTrophyDomain>(sql, @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_trophies", @params, records.Count);
        return records;
    }

    private async Task<List<EncounterSpotDomain>> GetSpotsWithCombatantsAsync(NpgsqlConnection conn, Guid encounterId)
    {
        var @params = new { EncounterId = encounterId };
        var spotSql =
            $@"SELECT {SpotColumns}
               FROM encounter_spots s
               WHERE s.encounter_id = @EncounterId
               ORDER BY s.initiative_order, s.created_at";

        var combatantSql =
            $@"SELECT {CombatantColumns}
               FROM encounter_combatants c
               WHERE c.encounter_id = @EncounterId
               ORDER BY c.created_at";

        var spots = (await conn.QueryAsync<EncounterSpotDomain>(spotSql, @params)).ToList();
        var combatants = (await conn.QueryAsync<EncounterCombatantDomain>(combatantSql, @params)).ToList();

        AttachCombatants(spots, combatants);
        await AttachConditionsAsync(conn, combatants);
        return spots;
    }

    private sealed class CombatantConditionRow
    {
        public Guid CombatantId { get; set; }
        public string ConditionName { get; set; } = string.Empty;
    }

    private sealed class PlayerCardConditionRow
    {
        public Guid PlayerCardId { get; set; }
        public string ConditionName { get; set; } = string.Empty;
    }

    private async Task AttachConditionsAsync(NpgsqlConnection conn, List<EncounterCombatantDomain> combatants)
    {
        if (combatants.Count == 0) return;

        var combatantIds = combatants.Select(c => c.Id).ToArray();
        var cardIds = combatants
            .Where(c => c.PlayerCardId is not null)
            .Select(c => c.PlayerCardId!.Value)
            .Distinct()
            .ToArray();

        var castSql =
            @"SELECT encounter_combatant_id AS CombatantId,
                     condition_name         AS ConditionName
              FROM encounter_combatant_conditions
              WHERE encounter_combatant_id = ANY(@CombatantIds)
              ORDER BY assigned_at";

        var castRows = (await conn.QueryAsync<CombatantConditionRow>(
            castSql, new { CombatantIds = combatantIds })).ToList();

        var byCombatant = castRows
            .GroupBy(row => row.CombatantId)
            .ToDictionary(g => g.Key, g => g.Select(row => row.ConditionName).ToList());

        var cardRows = new List<PlayerCardConditionRow>();
        if (cardIds.Length > 0)
        {
            var cardSql =
                @"SELECT player_card_id AS PlayerCardId,
                         condition_name AS ConditionName
                  FROM player_card_conditions
                  WHERE player_card_id = ANY(@CardIds)
                  ORDER BY assigned_at";

            cardRows = (await conn.QueryAsync<PlayerCardConditionRow>(
                cardSql, new { CardIds = cardIds })).ToList();
        }

        var byCard = cardRows
            .GroupBy(row => row.PlayerCardId)
            .ToDictionary(g => g.Key, g => g.Select(row => row.ConditionName).ToList());

        foreach (var combatant in combatants)
        {
            if (byCombatant.TryGetValue(combatant.Id, out var own))
            {
                combatant.Conditions = own;
                continue;
            }

            if (combatant.PlayerCardId is Guid cardId && byCard.TryGetValue(cardId, out var carried))
            {
                combatant.Conditions = carried;
            }
        }
    }
}
