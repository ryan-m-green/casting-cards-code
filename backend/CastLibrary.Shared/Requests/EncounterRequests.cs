namespace CastLibrary.Shared.Requests;

public class CreateEncounterRequest
{
    public string Name { get; set; } = string.Empty;
}

public class AddCombatantRequest
{
    /// <summary>"cast" or "player".</summary>
    public string CombatantType { get; set; } = "cast";

    /// <summary>Library cast id (required when CombatantType == "cast").</summary>
    public Guid? SourceCastId { get; set; }

    /// <summary>Player card id (required when CombatantType == "player").</summary>
    public Guid? PlayerCardId { get; set; }

    /// <summary>Optional originating campaign cast instance (traceability only).</summary>
    public Guid? OriginCampaignCastInstanceId { get; set; }

    /// <summary>Optional existing spot to attach to (used when adding to a group).</summary>
    public Guid? SpotId { get; set; }
}

public class CreateGroupRequest
{
    public string GroupName { get; set; } = string.Empty;

    /// <summary>Existing combatant ids to move into the new group spot.</summary>
    public List<Guid> CombatantIds { get; set; } = [];
}

public class UpdateCombatantRequest
{
    public int? MaxHitPoints { get; set; }
    public int? LostHitPoints { get; set; }
    public int? TempHitPoints { get; set; }
    public bool? IsDefeated { get; set; }
    public bool? IsCaptured { get; set; }
    public bool? IsEscaped { get; set; }
    public string? Notes { get; set; }
}

public class ReorderSpotsRequest
{
    /// <summary>Spot ids in the desired initiative order.</summary>
    public List<Guid> SpotIds { get; set; } = [];
}

/// <summary>One cast/player card to place into a new encounter spot.</summary>
public class CreateSpotCombatantRequest
{
    /// <summary>"cast" or "player".</summary>
    public string CombatantType { get; set; } = "cast";

    /// <summary>Library cast id (required when CombatantType == "cast").</summary>
    public Guid? SourceCastId { get; set; }

    /// <summary>Player card id (required when CombatantType == "player").</summary>
    public Guid? PlayerCardId { get; set; }

    /// <summary>Optional originating campaign cast instance (traceability only).</summary>
    public Guid? OriginCampaignCastInstanceId { get; set; }
}

/// <summary>
/// Creates an encounter spot and all of its combatants in one call, so a group
/// is either fully there or not there at all (no stray half-built spots).
/// The spot name is assigned by the server (see the naming rule on the handler).
/// </summary>
public class CreateEncounterSpotRequest
{
    public List<CreateSpotCombatantRequest> Combatants { get; set; } = [];
}

public class RenameEncounterSpotRequest
{
    public string Name { get; set; } = string.Empty;
}

/// <summary>Renames the encounter itself (the card's title).</summary>
public class RenameEncounterRequest
{
    public string Name { get; set; } = string.Empty;
}

/// <summary>Initiative rolled for one spot; written onto all of its combatant rows.</summary>
public class SetSpotInitiativeRequest
{
    public Guid SpotId { get; set; }
    public int? InitiativeNumber { get; set; }
}

public class SetEncounterInitiativeRequest
{
    public List<SetSpotInitiativeRequest> Spots { get; set; } = [];
}

public class AdvanceTurnRequest
{
    /// <summary>"next" or "prev".</summary>
    public string Direction { get; set; } = "next";
}
