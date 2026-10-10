#nullable enable

using System.Security.Claims;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Hubs;

/// <summary>One event a receiving client is reporting it got (see the hub's ReportEventAcks).</summary>
public sealed record ReceivedEventAck(string EventName, string? CampaignId);

/// <summary>
/// One event a receiving client is reporting its components handled (see the hub's
/// ReportComponentAcks, and the frontend's CampaignHubService.on).
/// </summary>
public sealed record ReceivedComponentAck(string EventName, string? CampaignId, string[] Components);

/// <summary>
/// The campaign hub: one group per campaign, plus the few things a client asks for itself.
///
/// Almost everything the app broadcasts goes out through ISignalRNotificationService rather than
/// from here (see SignalRNotificationService), so what stays in the hub is what a client has to
/// ask for — joining and leaving its campaign's group — and the handful of events a client raises
/// on its own behalf.
///
/// The hub also keeps the inspector's window honest: it tells SignalRInspector who is connected
/// and which campaign rooms they are in, so a broadcast row can say who was listening when it
/// went out, and it takes a receiving client's own word for what arrived (see ReportEventAck), so
/// the window can show a send arriving rather than merely leaving.
/// </summary>
[Authorize]
public class CampaignHub(SignalRInspector inspector) : Hub
{
    public override async Task OnConnectedAsync()
    {
        inspector.Connected(
            Context.ConnectionId,
            Context.UserIdentifier,
            Context.User?.FindFirst(ClaimTypes.Role)?.Value,
            Context.User?.FindFirst("displayName")?.Value);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        inspector.Disconnected(Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinCampaign(string campaignId)
    {
        inspector.JoinedCampaign(Context.ConnectionId, campaignId);

        await Groups.AddToGroupAsync(Context.ConnectionId, campaignId);
    }

    public async Task LeaveCampaign(string campaignId)
    {
        inspector.LeftCampaign(Context.ConnectionId, campaignId);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, campaignId);
    }

    public Task PlayerSecretRevealed(string campaignId, string secretId) =>
        SendToCampaignAsync(campaignId, "PlayerSecretRevealed", new { secretId, campaignId });

    public Task InventoryItemUsed(Guid campaignId, Guid playerUserId, Guid inventoryItemId) =>
        SendToCampaignAsync(campaignId.ToString(), "InventoryItemUsed",
            new { campaignId, playerUserId, inventoryItemId });

    public Task NotifySubscriptionLockLevelChanged(Guid userId, string newLockLevel) =>
        SendToUserAsync(userId, "SubscriptionLockLevelChanged", new { userId, newLockLevel });

    public Task TriggerSoundtrack(Guid campaignId, Guid soundtrackId, Guid dmUserId) =>
        SendToUserAsync(dmUserId, "SoundtrackTriggered", new { campaignId, soundtrackId });

    /// <summary>
    /// A client asking the campaign to light one grid area's button (see the frontend's
    /// V2AreaChangeService). The area is named as the grid names it, and a user id, when given,
    /// aims the notice at that one user's screen whatever their role; without one it is for the
    /// players at large. This is the client-instructed door — a widget raising a notice for its own
    /// area. A notice the server decides on goes out through the notification service instead (see
    /// ISignalRNotificationService.BroadcastGridAreaNoticeAsync), once, at the change.
    /// </summary>
    public Task RaiseGridAreaNotice(string campaignId, string gridArea, string? userId = null) =>
        SendToCampaignAsync(
            campaignId,
            ISignalRNotificationService.EventNames.GridAreaNotice,
            new { campaignId, gridArea, userId });

    /// <summary>
    /// A receiving client saying what it got (see the dev tap in CampaignHubService). Paired with
    /// the inspector's own broadcast log, this is what turns "the event was sent" into "the event
    /// arrived on that connection". Best-effort by design: a client that never calls it simply
    /// shows as unacked, which is itself the answer the GM is looking for.
    /// </summary>
    public Task ReportEventAck(string eventName, string? campaignId)
    {
        inspector.Acked(Context.ConnectionId, eventName, campaignId);

        return Task.CompletedTask;
    }

    /// <summary>
    /// The same, for a client that has been collecting: an event a drag on the clock emits fifty of
    /// is one call here rather than fifty, so a window watching the traffic does not become traffic
    /// of its own. Kept beside <see cref="ReportEventAck"/> so a client on the older call still
    /// works — an unknown method is an error the client would otherwise log per event.
    /// </summary>
    public Task ReportEventAcks(ReceivedEventAck[]? acks)
    {
        if (acks is null) return Task.CompletedTask;

        foreach (var ack in acks)
        {
            if (string.IsNullOrWhiteSpace(ack.EventName)) continue;

            inspector.Acked(Context.ConnectionId, ack.EventName, ack.CampaignId);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// The same, for a client saying which of its components handled each event (see the frontend's
    /// CampaignHubService.on). Kept beside <see cref="ReportEventAcks"/> so the two arrive on the same
    /// client heartbeat and the window can show a player's receipt with its components on one row.
    /// </summary>
    public Task ReportComponentAcks(ReceivedComponentAck[]? acks)
    {
        if (acks is null) return Task.CompletedTask;

        foreach (var ack in acks)
        {
            if (string.IsNullOrWhiteSpace(ack.EventName)) continue;

            inspector.ComponentAcked(Context.ConnectionId, ack.EventName, ack.CampaignId, ack.Components ?? []);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// A client-raised send to its campaign's group, with a row left in the inspector for it:
    /// these sends do not pass through the notification service, and an unwritten send would make
    /// its ack look like something that arrived from nowhere.
    /// </summary>
    private async Task SendToCampaignAsync(string campaignId, string eventName, object payload)
    {
        var subscribers = inspector.CountSubscribers(SignalRTargets.Campaign, campaignId);

        try
        {
            await Clients.Group(campaignId).SendAsync(eventName, payload);
            inspector.Broadcast(eventName, SignalRTargets.Campaign, campaignId, payload, subscribers);
        }
        catch (Exception)
        {
            inspector.Broadcast(eventName, SignalRTargets.Campaign, campaignId, payload, subscribers, failed: true);
            throw;
        }
    }

    /// <summary>The same, for the sends aimed at one user's own connections.</summary>
    private async Task SendToUserAsync(Guid userId, string eventName, object payload)
    {
        var subscribers = inspector.CountSubscribers(SignalRTargets.User, userId.ToString());

        try
        {
            await Clients.User(userId.ToString()).SendAsync(eventName, payload);
            inspector.Broadcast(eventName, SignalRTargets.User, userId.ToString(), payload, subscribers);
        }
        catch (Exception)
        {
            inspector.Broadcast(eventName, SignalRTargets.User, userId.ToString(), payload, subscribers, failed: true);
            throw;
        }
    }
}

