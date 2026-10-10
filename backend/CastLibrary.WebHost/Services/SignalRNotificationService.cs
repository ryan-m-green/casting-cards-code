using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CastLibrary.WebHost.Services;

public class SignalRNotificationService(
    IHubContext<CampaignHub> hubContext,
    ILogger<SignalRNotificationService> logger) : ISignalRNotificationService
{
    // Generic broadcasting methods
    public async Task BroadcastToCampaignAsync<T>(Guid campaignId, string eventName, T payload)
    {
        try
        {
            await hubContext.Clients.Group(campaignId.ToString())
                .SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to campaign {CampaignId}", eventName, campaignId);
        }
    }

    public async Task BroadcastToUserAsync<T>(Guid userId, string eventName, T payload)
    {
        try
        {
            await hubContext.Clients.User(userId.ToString())
                .SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to user {UserId}", eventName, userId);
        }
    }

    public async Task BroadcastToGroupAsync<T>(string groupName, string eventName, T payload)
    {
        try
        {
            await hubContext.Clients.Group(groupName)
                .SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SignalR broadcast failed for event {EventName} to group {GroupName}", eventName, groupName);
        }
    }

    public async Task BroadcastToAllAsync<T>(string eventName, T payload)
    {
        try
        {
            await hubContext.Clients.All
                .SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
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