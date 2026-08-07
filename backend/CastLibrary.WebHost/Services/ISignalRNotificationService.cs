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

        // Player Events
        public const string PlayerJoined = "PlayerJoined";
        public const string PlayerRemoved = "PlayerRemoved";
        public const string ConditionAssigned = "ConditionAssigned";
        public const string ConditionRemoved = "ConditionRemoved";
        public const string GoldAwarded = "GoldAwarded";
        public const string CastTraveled = "CastTraveled";

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

        // Shop Events
        public const string ShopItemAdded = "ShopItemAdded";
        public const string ShopItemUpdated = "ShopItemUpdated";
        public const string ShopItemDeleted = "ShopItemDeleted";
        public const string ShopItemScratchToggled = "ShopItemScratchToggled";

        // System Events
        public const string InventoryItemUsed = "InventoryItemUsed";
        public const string SoundtrackTriggered = "SoundtrackTriggered";
        public const string SubscriptionLockLevelChanged = "SubscriptionLockLevelChanged";
        public const string CampaignNavChanged = "CampaignNavChanged";
        public const string StorylineEventUpdated = "StorylineEventUpdated";

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

    // Player Events
    Task BroadcastPlayerJoinedAsync(Guid campaignId, object payload);
    Task BroadcastPlayerRemovedAsync(Guid campaignId, object payload);
    Task BroadcastConditionAssignedAsync(Guid campaignId, object payload);
    Task BroadcastConditionRemovedAsync(Guid campaignId, object payload);
    Task BroadcastGoldAwardedAsync(Guid campaignId, object payload);
    Task BroadcastCastTraveledAsync(Guid campaignId, object payload);

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

    // Shop Events
    Task BroadcastShopItemAddedAsync(Guid campaignId, object payload);
    Task BroadcastShopItemUpdatedAsync(Guid campaignId, object payload);
    Task BroadcastShopItemDeletedAsync(Guid campaignId, object payload);
    Task BroadcastShopItemScratchToggledAsync(Guid campaignId, object payload);

    // System Events
    Task BroadcastInventoryItemUsedAsync(Guid campaignId, object payload);
    Task BroadcastSoundtrackTriggeredAsync(Guid userId, object payload);
    Task BroadcastSubscriptionLockLevelChangedAsync(Guid userId, object payload);
    Task BroadcastCampaignNavChangedAsync(Guid campaignId, object payload);
    Task BroadcastStorylineEventUpdatedAsync(Guid campaignId, object payload);

    // Testing utility methods
    string[] GetAllEventNames();
    Task BroadcastAllEventsAsync(Guid campaignId);
}