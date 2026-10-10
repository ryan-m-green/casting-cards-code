using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Services;

public interface ISignalRNotificationService
{
    // Event name constants for all SignalR events
    public static class EventNames
    {
        // Secret Events
        public const string PlayerSecretRevealed = "PlayerSecretRevealed";
        public const string SecretCreated = "SecretCreated";
        public const string PlayerSecretCreated = "PlayerSecretCreated";
        public const string PlayerSecretChanged = "PlayerSecretChanged";
        public const string SecretDeleted = "SecretDeleted";
        public const string SecretDelivered = "SecretDelivered";
        public const string SecretResealed = "SecretResealed";
        public const string SecretShared = "SecretShared";
        public const string PlayerSecretDeleted = "PlayerSecretDeleted";

        // Visibility Events
        public const string CardVisibilityChanged = "CardVisibilityChanged";
        public const string BulkCardVisibilityChanged = "BulkCardVisibilityChanged";

        // Campaign Entity Events
        public const string CastInstanceUpdated = "CastInstanceUpdated";
        public const string LocationInstanceUpdated = "LocationInstanceUpdated";
        public const string SublocationInstanceUpdated = "SublocationInstanceUpdated";
        public const string FactionInstanceUpdated = "FactionInstanceUpdated";
        public const string FactionRemoved = "FactionRemoved";
        public const string FactionLocked = "FactionLocked";
        public const string FactionSymbolAssigned = "FactionSymbolAssigned";
        public const string FactionPartyCastChanged = "FactionPartyCastChanged";

        // Player Events
        public const string PlayerJoined = "PlayerJoined";
        public const string PlayerRemoved = "PlayerRemoved";
        public const string ConditionAssigned = "ConditionAssigned";
        public const string ConditionRemoved = "ConditionRemoved";
        public const string GoldAwarded = "GoldAwarded";
        public const string CastTraveled = "CastTraveled";
        public const string PlayerCardTraitsChanged = "PlayerCardTraitsChanged";
        public const string PlayerCardUpdated = "PlayerCardUpdated";

        // Time & Session Events
        public const string TimeOfDayUpdated = "TimeOfDayUpdated";
        public const string TimeCursorMoved = "TimeCursorMoved";
        public const string DayAdvanced = "DayAdvanced";
        public const string SessionStarted = "SessionStarted";
        public const string SessionEnded = "SessionEnded";
        public const string SessionCancelled = "SessionCancelled";
        public const string SessionDeleted = "SessionDeleted";

        // Notes Events
        public const string NoteUpdated = "NoteUpdated";
        public const string PlayerNotesUpdated = "PlayerNotesUpdated";
        public const string DmNotesUpdated = "DmNotesUpdated";
        public const string QuickNoteQueued = "QuickNoteQueued";

        public const string ChronicleAdded = "ChronicleAdded";

        // Shop Events
        public const string ShopItemAdded = "ShopItemAdded";
        public const string ShopItemUpdated = "ShopItemUpdated";
        public const string ShopItemDeleted = "ShopItemDeleted";
        public const string ShopItemScratchToggled = "ShopItemScratchToggled";

        // System Events
        public const string InventoryItemUsed = "InventoryItemUsed";
        public const string InventoryItemPurchased = "InventoryItemPurchased";
        public const string SoundtrackTriggered = "SoundtrackTriggered";
        public const string AmbianceChanged = "AmbianceChanged";
        public const string SubscriptionLockLevelChanged = "SubscriptionLockLevelChanged";
        public const string CampaignNavChanged = "CampaignNavChanged";
        public const string StorylineEventUpdated = "StorylineEventUpdated";

        // World Map Events
        public const string WorldMapImageChanged = "WorldMapImageChanged";

        // Grid Area Events
        public const string GridAreaNotice = "GridAreaNotice";

        // Encounter Events
        public const string EncounterUpdated = "EncounterUpdated";
        public const string EncounterCombatantUpdated = "EncounterCombatantUpdated";
        public const string EncounterTurnChanged = "EncounterTurnChanged";
        public const string TrophyAwarded = "TrophyAwarded";
        public const string FieldJournalUpdated = "FieldJournalUpdated";
        public const string EncounterEnded = "EncounterEnded";

        // Hub Connection Events
        public const string Ping = "ping";
    }

    // Generic broadcasting methods
    Task BroadcastToCampaignAsync<T>(Guid campaignId, string eventName, T payload);
    Task BroadcastToUserAsync<T>(Guid userId, string eventName, T payload);
    Task BroadcastToGroupAsync<T>(string groupName, string eventName, T payload);
    Task BroadcastToAllAsync<T>(string eventName, T payload);

    // Typed methods for common events (provides compile-time safety and easier testing)
    
    // Secret Events
    Task BroadcastPlayerSecretRevealedAsync(Guid campaignId, SecretRevealedEvent payload);
    Task BroadcastSecretCreatedAsync(Guid campaignId, object payload);
    Task BroadcastPlayerSecretCreatedAsync(Guid campaignId, object payload);
    Task BroadcastPlayerSecretChangedAsync(Guid campaignId, object payload);
    Task BroadcastSecretDeletedAsync(Guid campaignId, object payload);
    Task BroadcastSecretDeliveredAsync(Guid campaignId, object payload);
    Task BroadcastSecretResealedAsync(Guid campaignId, SecretResealedEvent payload);
    Task BroadcastSecretSharedAsync(Guid campaignId, object payload);
    Task BroadcastPlayerSecretDeletedAsync(Guid campaignId, object payload);

    // Visibility Events
    Task BroadcastCardVisibilityChangedAsync(Guid campaignId, CardVisibilityChangedEvent payload);
    Task BroadcastBulkCardVisibilityChangedAsync(Guid campaignId, BulkCardVisibilityChangedEvent payload);

    // Campaign Entity Events
    Task BroadcastCastInstanceUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastLocationInstanceUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastSublocationInstanceUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastFactionInstanceUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastFactionRemovedAsync(Guid campaignId, object payload);
    Task BroadcastFactionLockedAsync(Guid campaignId, object payload);
    Task BroadcastFactionSymbolAssignedAsync(Guid campaignId, object payload);
    /// <summary>
    /// The party's own cast cards in a faction have moved — a member added or taken off, or their
    /// crowned leader set or taken off. Carries the faction as the party's own read now holds it,
    /// so a watcher takes the change on from what it is handed (the GM's look at the party's row,
    /// and every player's own row). The GM's side of the membership is neither written nor sent by
    /// the party's writes: it is the GM's.
    /// </summary>
    Task BroadcastFactionPartyCastChangedAsync(Guid campaignId, object payload);

    // Player Events
    Task BroadcastPlayerJoinedAsync(Guid campaignId, object payload);
    Task BroadcastPlayerRemovedAsync(Guid campaignId, object payload);
    Task BroadcastConditionAssignedAsync(Guid campaignId, object payload);
    Task BroadcastConditionRemovedAsync(Guid campaignId, object payload);
    Task BroadcastGoldAwardedAsync(Guid campaignId, object payload);
    Task BroadcastCastTraveledAsync(Guid campaignId, object payload);
    /// <summary>
    /// A player card's motivations (traits) changed — one was added, removed, completed or shared.
    /// Carries the card's whole trait list as it now stands, so a watcher (the party grid, and the
    /// card's own owner's "My Character" area) takes the change on from what it is handed rather
    /// than reading the list back.
    /// </summary>
    Task BroadcastPlayerCardTraitsChangedAsync(Guid campaignId, object payload);
    /// <summary>
    /// A player card's own fields were written by the player who owns it: their name, race, class,
    /// description, or a new portrait. Carries those fields as the write left them â€” the portrait's
    /// public url among them, keyed with the version the upload wrote it under, so a replaced picture
    /// is not served from a cache â€” so a watcher takes the change on from what it is handed rather
    /// than reading the card back: the GM's party grid and the player drawer it opens from (see the
    /// frontend's cc-party-panel and cc-player-secrets-content).
    /// </summary>
    Task BroadcastPlayerCardUpdatedAsync(Guid campaignId, object payload);

    // Time & Session Events
    Task BroadcastTimeOfDayUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastTimeCursorMovedAsync(Guid campaignId, object payload);
    Task BroadcastDayAdvancedAsync(Guid campaignId, object payload);
    Task BroadcastSessionStartedAsync(Guid campaignId, object payload);
    Task BroadcastSessionEndedAsync(Guid campaignId, object payload);
    Task BroadcastSessionCancelledAsync(Guid campaignId, object payload);
    Task BroadcastSessionDeletedAsync(Guid campaignId, object payload);

    // Notes Events
    Task BroadcastNoteUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastPlayerNotesUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastDmNotesUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastQuickNoteQueuedAsync(Guid campaignId, object payload);

    Task BroadcastChronicleAddedAsync(Guid campaignId, object payload);

    // Shop Events
    Task BroadcastShopItemAddedAsync(Guid campaignId, object payload);
    Task BroadcastShopItemUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastShopItemDeletedAsync(Guid campaignId, object payload);
    Task BroadcastShopItemScratchToggledAsync(Guid campaignId, object payload);

    // System Events
    Task BroadcastInventoryItemUsedAsync(Guid campaignId, object payload);
    /// <summary>
    /// A shop purchase was persisted: the item went into the buyer's own bag and their purse paid
    /// for it. Raised to the campaign room as the last thing the purchase does, so every bag open on
    /// the buyer's connections — the inventory grid area among them — reads the shelf of what it now
    /// carries back rather than holding what it read before the purchase.
    /// </summary>
    Task BroadcastInventoryItemPurchasedAsync(Guid campaignId, object payload);
    Task BroadcastSoundtrackTriggeredAsync(Guid userId, object payload);
    Task BroadcastSubscriptionLockLevelChangedAsync(Guid userId, object payload);
    Task BroadcastCampaignNavChangedAsync(Guid campaignId, object payload);
    Task BroadcastStorylineEventUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastAmbianceChangedAsync(Guid campaignId, object payload);

    // World Map Events
    /// <summary>
    /// A new world map picture was put on the campaign (see the API's CampaignController). The
    /// payload carries the map's public url as the upload wrote it, so every screen drawing the same
    /// map takes the new picture on from what it is handed rather than reading the campaign back
    /// (see CampaignResponse.WorldMapImageUrl, and the frontend's cc-world-map).
    /// </summary>
    Task BroadcastWorldMapImageChangedAsync(Guid campaignId, object payload);

    // Grid Area Events
    /// <summary>
    /// A grid area's button should call attention: the area a viewer should turn to has changed
    /// (see the frontend's V2AreaChangeService, which lights the radial navigator). The payload
    /// names the area and, optionally, the single user the notice is for — whatever their role; a
    /// payload with no user is for the players at large.
    /// </summary>
    Task BroadcastGridAreaNoticeAsync(Guid campaignId, object payload);

    // Encounter Events
    Task BroadcastEncounterUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastEncounterCombatantUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastEncounterTurnChangedAsync(Guid campaignId, object payload);
    Task BroadcastTrophyAwardedAsync(Guid campaignId, object payload);
    Task BroadcastFieldJournalUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastEncounterEndedAsync(Guid campaignId, object payload);

    // Testing utility methods
    string[] GetAllEventNames();
    Task BroadcastAllEventsAsync(Guid campaignId);
}