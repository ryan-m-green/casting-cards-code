using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Services;

public class SignalRNotificationService(
    IHubContext<CampaignHub> hubContext,
    ILogger<SignalRNotificationService> logger,
    SignalRInspector inspector) : ISignalRNotificationService
{
    // Generic broadcasting methods
    public async Task BroadcastToCampaignAsync<T>(Guid campaignId, string eventName, T payload)
    {
        // Who is listening is read before the send, so the inspector's row says what the room held
        // when the event went out, not what it holds by the time the window is read.
        var subscribers = inspector.CountSubscribers(SignalRTargets.Campaign, campaignId.ToString());

        try
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync(eventName, payload);

            inspector.Broadcast(eventName, SignalRTargets.Campaign, campaignId.ToString(), payload, subscribers);
        }
        catch (Exception ex)
        {
            inspector.Broadcast(eventName, SignalRTargets.Campaign, campaignId.ToString(), payload, subscribers, failed: true);
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to campaign {CampaignId}", eventName, campaignId);
        }
    }

    public async Task BroadcastToUserAsync<T>(Guid userId, string eventName, T payload)
    {
        var subscribers = inspector.CountSubscribers(SignalRTargets.User, userId.ToString());

        try
        {
            await hubContext.Clients.User(userId.ToString())
                .SendAsync(eventName, payload);

            inspector.Broadcast(eventName, SignalRTargets.User, userId.ToString(), payload, subscribers);
        }
        catch (Exception ex)
        {
            inspector.Broadcast(eventName, SignalRTargets.User, userId.ToString(), payload, subscribers, failed: true);
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to user {UserId}", eventName, userId);
        }
    }

    public async Task BroadcastToGroupAsync<T>(string groupName, string eventName, T payload)
    {
        var subscribers = inspector.CountSubscribers(SignalRTargets.Group, groupName);

        try
        {
            await hubContext.Clients.Group(groupName)
                .SendAsync(eventName, payload);

            inspector.Broadcast(eventName, SignalRTargets.Group, groupName, payload, subscribers);
        }
        catch (Exception ex)
        {
            inspector.Broadcast(eventName, SignalRTargets.Group, groupName, payload, subscribers, failed: true);
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to group {GroupName}", eventName, groupName);
        }
    }

    public async Task BroadcastToAllAsync<T>(string eventName, T payload)
    {
        var subscribers = inspector.CountSubscribers(SignalRTargets.All, null);

        try
        {
            await hubContext.Clients.All
                .SendAsync(eventName, payload);

            inspector.Broadcast(eventName, SignalRTargets.All, null, payload, subscribers);
        }
        catch (Exception ex)
        {
            inspector.Broadcast(eventName, SignalRTargets.All, null, payload, subscribers, failed: true);
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to all clients", eventName);
        }
    }

    // Typed methods for Secret Events
    public async Task BroadcastPlayerSecretRevealedAsync(Guid campaignId, SecretRevealedEvent payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerSecretRevealed, payload);
    }

    public async Task BroadcastSecretCreatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SecretCreated, payload);
    }

    public async Task BroadcastPlayerSecretCreatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerSecretCreated, payload);
    }

    public async Task BroadcastPlayerSecretChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerSecretChanged, payload);
    }

    public async Task BroadcastSecretDeletedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SecretDeleted, payload);
    }

    public async Task BroadcastSecretDeliveredAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SecretDelivered, payload);
    }

    public async Task BroadcastSecretResealedAsync(Guid campaignId, SecretResealedEvent payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SecretResealed, payload);
    }

    public async Task BroadcastSecretSharedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SecretShared, payload);
    }

    public async Task BroadcastPlayerSecretDeletedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerSecretDeleted, payload);
    }

    // Typed methods for Visibility Events
    public async Task BroadcastCardVisibilityChangedAsync(Guid campaignId, CardVisibilityChangedEvent payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.CardVisibilityChanged, payload);
    }

    public async Task BroadcastBulkCardVisibilityChangedAsync(Guid campaignId, BulkCardVisibilityChangedEvent payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.BulkCardVisibilityChanged, payload);
    }

    // Typed methods for Campaign Entity Events
    public async Task BroadcastCastInstanceUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.CastInstanceUpdated, payload);
    }

    public async Task BroadcastLocationInstanceUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.LocationInstanceUpdated, payload);
    }

    public async Task BroadcastSublocationInstanceUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SublocationInstanceUpdated, payload);
    }

    public async Task BroadcastFactionInstanceUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.FactionInstanceUpdated, payload);
    }

    public async Task BroadcastFactionRemovedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.FactionRemoved, payload);
    }

    public async Task BroadcastFactionLockedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.FactionLocked, payload);
    }

    public async Task BroadcastFactionSymbolAssignedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.FactionSymbolAssigned, payload);
    }

    public async Task BroadcastFactionPartyCastChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.FactionPartyCastChanged, payload);
    }

    // Typed methods for Player Events
    public async Task BroadcastPlayerJoinedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerJoined, payload);
    }

    public async Task BroadcastPlayerRemovedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerRemoved, payload);
    }

    public async Task BroadcastConditionAssignedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ConditionAssigned, payload);
    }

    public async Task BroadcastConditionRemovedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ConditionRemoved, payload);
    }

    public async Task BroadcastGoldAwardedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.GoldAwarded, payload);
    }

    public async Task BroadcastCastTraveledAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.CastTraveled, payload);
    }

    public async Task BroadcastPlayerCardTraitsChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerCardTraitsChanged, payload);
    }

    public async Task BroadcastPlayerCardUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerCardUpdated, payload);
    }

    // Typed methods for Time & Session Events
    public async Task BroadcastTimeOfDayUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.TimeOfDayUpdated, payload);
    }

    public async Task BroadcastTimeCursorMovedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.TimeCursorMoved, payload);
    }

    public async Task BroadcastDayAdvancedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.DayAdvanced, payload);
    }

    public async Task BroadcastSessionStartedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SessionStarted, payload);
    }

    public async Task BroadcastSessionEndedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SessionEnded, payload);
    }

    public async Task BroadcastSessionCancelledAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SessionCancelled, payload);
    }

    public async Task BroadcastSessionDeletedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.SessionDeleted, payload);
    }

    // Typed methods for Notes Events
    public async Task BroadcastNoteUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.NoteUpdated, payload);
    }

    public async Task BroadcastPlayerNotesUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.PlayerNotesUpdated, payload);
    }

    public async Task BroadcastDmNotesUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.DmNotesUpdated, payload);
    }

    public async Task BroadcastQuickNoteQueuedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.QuickNoteQueued, payload);
    }

    public async Task BroadcastChronicleAddedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ChronicleAdded, payload);
    }

    // Typed methods for Shop Events
    public async Task BroadcastShopItemAddedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ShopItemAdded, payload);
    }

    public async Task BroadcastShopItemUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ShopItemUpdated, payload);
    }

    public async Task BroadcastShopItemDeletedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ShopItemDeleted, payload);
    }

    public async Task BroadcastShopItemScratchToggledAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.ShopItemScratchToggled, payload);
    }

    // Typed methods for System Events
    public async Task BroadcastInventoryItemUsedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.InventoryItemUsed, payload);
    }

    public async Task BroadcastInventoryItemPurchasedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.InventoryItemPurchased, payload);
    }

    public async Task BroadcastSoundtrackTriggeredAsync(Guid userId, object payload)
    {
        await BroadcastToUserAsync(userId, ISignalRNotificationService.EventNames.SoundtrackTriggered, payload);
    }

    public async Task BroadcastSubscriptionLockLevelChangedAsync(Guid userId, object payload)
    {
        await BroadcastToUserAsync(userId, ISignalRNotificationService.EventNames.SubscriptionLockLevelChanged, payload);
    }

    public async Task BroadcastCampaignNavChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.CampaignNavChanged, payload);
    }

    public async Task BroadcastStorylineEventUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.StorylineEventUpdated, payload);
    }

    public async Task BroadcastAmbianceChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.AmbianceChanged, payload);
    }

    // Typed methods for World Map Events
    public async Task BroadcastWorldMapImageChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.WorldMapImageChanged, payload);
    }

    // Typed methods for Grid Area Events
    public async Task BroadcastGridAreaNoticeAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.GridAreaNotice, payload);
    }

    // Typed methods for Encounter Events
    public async Task BroadcastEncounterUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.EncounterUpdated, payload);
    }

    public async Task BroadcastEncounterCombatantUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.EncounterCombatantUpdated, payload);
    }

    public async Task BroadcastEncounterTurnChangedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.EncounterTurnChanged, payload);
    }

    public async Task BroadcastTrophyAwardedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.TrophyAwarded, payload);
    }

    public async Task BroadcastFieldJournalUpdatedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.FieldJournalUpdated, payload);
    }

    public async Task BroadcastEncounterEndedAsync(Guid campaignId, object payload)
    {
        await BroadcastToCampaignAsync(campaignId, ISignalRNotificationService.EventNames.EncounterEnded, payload);
    }

    // Testing utility methods
    public string[] GetAllEventNames()
    {
        return typeof(ISignalRNotificationService.EventNames)
            .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
            .Where(f => f.IsLiteral && f.FieldType == typeof(string))
            .Select(f => f.GetValue(null)?.ToString())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToArray()!;
    }

    public async Task BroadcastAllEventsAsync(Guid campaignId)
    {
        var allEventNames = GetAllEventNames();
        foreach (var eventName in allEventNames)
        {
            try
            {
                // Send a test payload for each event
                var testPayload = new
                {
                    campaignId = campaignId,
                    timestamp = DateTime.UtcNow,
                    isTest = true
                };
                await BroadcastToCampaignAsync(campaignId, eventName, testPayload);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to broadcast test event {EventName}", eventName);
            }
        }
    }
}