namespace CastLibrary.Shared.Domain;

/// <summary>
/// The rules one encounter's initiative ring is played by.
/// </summary>
public static class EncounterRules
{
    /// <summary>
    /// How many places one encounter's ring holds, the party included. A spot per
    /// player card is created with the encounter itself, so the party's places are
    /// the first slots of this budget and the DM fills only what is left of it with
    /// groups. A campaign holding more players than this therefore starts with a
    /// full ring — the party is never kept out of the fight — and nothing more can
    /// be added to it.
    /// </summary>
    public const int MaxSpots = 10;
}

public class CampaignEncounterDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int SequenceNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public Guid? CurrentSpotId { get; set; }
    public int RoundNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    /// <summary>
    /// The encounter's spots with their combatants. Both the list and the detail
    /// reads fill this in, so anything counting what an encounter holds (the
    /// encounter cards) works off the encounter itself.
    /// </summary>
    public List<EncounterSpotDomain> Spots { get; set; } = [];
}

public class EncounterSpotDomain
{
    public Guid Id { get; set; }
    public Guid EncounterId { get; set; }
    public int InitiativeOrder { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public int TurnsTaken { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<EncounterCombatantDomain> Combatants { get; set; } = [];
}

public class EncounterCombatantDomain
{
    public Guid Id { get; set; }
    public Guid SpotId { get; set; }
    public Guid EncounterId { get; set; }
    public string CombatantType { get; set; } = "cast";
    public Guid? SourceCastId { get; set; }
    public Guid? PlayerCardId { get; set; }
    public Guid? OriginCampaignCastInstanceId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int MaxHitPoints { get; set; }
    public int LostHitPoints { get; set; }
    public int TempHitPoints { get; set; }
    public bool IsDefeated { get; set; }

    public bool IsCaptured { get; set; }

    public bool IsEscaped { get; set; }

    public string Notes { get; set; } = string.Empty;

    public List<string> Conditions { get; set; } = [];

    /// <summary>
    /// The initiative number rolled for this combatant's encounter spot. Every
    /// combatant row in the same spot carries the same value (it is duplicated
    /// to mark that those rows belong to the one group spot). Null = not rolled.
    /// </summary>
    public int? InitiativeNumber { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// A condition the DM has given to one of an encounter's cards. A cast card is
/// the encounter's own row (not a player card), so its conditions hang off that
/// row, the way a party member's hang off their player card.
/// </summary>
public class EncounterCombatantConditionDomain
{
    public Guid Id { get; set; }
    public Guid CombatantId { get; set; }
    public string ConditionName { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
}

public class CampaignTrophyDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid SourceCastId { get; set; }
    public int DefeatedCount { get; set; }
    public DateTime FirstDefeatedAt { get; set; }

    /// <summary>
    /// The DM's own words on this trophy. Nothing writes it yet — the trophy features that do are
    /// still to come — so it reads as the database's NULL.
    /// </summary>
    public string? Notes { get; set; }

    // Enriched display fields (joined from casts)
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
}

/// <summary>
/// What one trophy capture took from an encounter: the tally rows it wrote in campaign_trophies —
/// one per distinct cast card, which is why a fight that put three of the same card down writes one
/// row and counts three — and the combatant rows it stamped as counted.
/// </summary>
public class EncounterTrophyCaptureDomain
{
    public int Trophies { get; set; }
    public int Combatants { get; set; }
}

public class EncounterTurnDomain
{
    public Guid? CurrentSpotId { get; set; }
    public int RoundNumber { get; set; }
    public bool Ended { get; set; }
}
