#nullable enable

using System.Collections.Concurrent;
using System.Text.Json;

namespace CastLibrary.WebHost.Services;

/// <summary>
/// The window on the campaign hub: who is connected, what was broadcast, and what the receiving
/// clients said came back.
///
/// It is a ticket window, not a domain service. Everything lives in memory for the life of the
/// process — the last few hundred broadcasts and acks, and the connections the hub has open right
/// now — and nothing here decides anything: the hub and the notification service write into it,
/// and the admin-only window reads out of it (see CampaignHub, SignalRNotificationService and
/// AdminSignalRController).
///
/// It exists to answer two questions a GM cannot otherwise answer from one machine: "is a player
/// socket even connected?", and "did the event I just caused actually arrive on the player's
/// screen?" — the second being what the acks are for: a receiving client says what it got, and the
/// report pairs each saying with the broadcast it belongs to.
/// </summary>
public sealed class SignalRInspector
{
    /// <summary>How many broadcasts and acks are held. The oldest fall off the front.</summary>
    public const int Capacity = 500;

    /// <summary>
    /// How much of a payload travels in the report. Large enough to read a whole card back in the
    /// window's popout, capped so one runaway payload cannot swamp the in-memory history.
    /// </summary>
    private const int PayloadJsonLimit = 20000;

    /// <summary>How long after a broadcast an ack may still be paired with it.</summary>
    private static readonly TimeSpan AckWindow = TimeSpan.FromSeconds(5);

    private readonly object _gate = new();
    private readonly ConcurrentDictionary<string, ConnectionEntry> _connections = new();
    private readonly Queue<BroadcastEntry> _broadcasts = new();
    private readonly Queue<AckEntry> _acks = new();
    private readonly Queue<ComponentAckEntry> _componentAcks = new();
    private long _sequence;

    // ── Presence, written by the hub ─────────────────────────────────────────────

    public void Connected(string connectionId, string? userId, string? role, string? displayName)
    {
        _connections[connectionId] = new ConnectionEntry
        {
            ConnectionId = connectionId,
            UserId = userId,
            Role = role,
            DisplayName = displayName,
            ConnectedAtUtc = DateTimeOffset.UtcNow,
        };
    }

    public void Disconnected(string connectionId)
    {
        _connections.TryRemove(connectionId, out _);
    }

    public void JoinedCampaign(string connectionId, string campaignId)
    {
        if (!_connections.TryGetValue(connectionId, out var entry)) return;

        lock (entry.Sync)
        {
            entry.CampaignIds.Add(campaignId);
        }
    }

    public void LeftCampaign(string connectionId, string campaignId)
    {
        if (!_connections.TryGetValue(connectionId, out var entry)) return;

        lock (entry.Sync)
        {
            entry.CampaignIds.Remove(campaignId);
        }
    }

    // ── Acks, written by the hub on a receiving client's own word ────────────────

    public void Acked(string connectionId, string eventName, string? campaignId)
    {
        _connections.TryGetValue(connectionId, out var entry);

        lock (_gate)
        {
            Enqueue(_acks, new AckEntry(
                eventName,
                campaignId,
                connectionId,
                entry?.UserId,
                entry?.Role,
                entry?.DisplayName,
                DateTimeOffset.UtcNow));
        }
    }

    /// <summary>
    /// One client saying which of its components handled one event (see the frontend's
    /// CampaignHubService.on). The names are the components' own; each attaches to the same broadcast
    /// its connection's own receipt attaches to, and is shown beside it in the window.
    /// </summary>
    public void ComponentAcked(string connectionId, string eventName, string? campaignId, IReadOnlyList<string> components)
    {
        if (components.Count == 0) return;

        lock (_gate)
        {
            Enqueue(_componentAcks, new ComponentAckEntry(
                eventName,
                campaignId,
                connectionId,
                components.ToArray(),
                DateTimeOffset.UtcNow));
        }
    }

    // ── Broadcasts, written by the notification service (and the hub's own sends) ─

    /// <summary>
    /// How many connections are in the target right now: the campaign's own members for a campaign
    /// target, the user's own connections for a user target, everyone for a broadcast. Read before
    /// a send, so the row says who was listening when it went out.
    /// </summary>
    public int CountSubscribers(string targetKind, string? targetId)
    {
        var all = _connections.Values.ToArray();

        return targetKind switch
        {
            SignalRTargets.Campaign => all.Count(c => IsInCampaign(c, targetId)),
            SignalRTargets.Group    => all.Count(c => IsInCampaign(c, targetId)),
            SignalRTargets.User     => all.Count(c => c.UserId == targetId),
            SignalRTargets.All      => all.Length,
            _                       => 0,
        };
    }

    public void Broadcast(
        string eventName,
        string targetKind,
        string? targetId,
        object? payload,
        int subscribers,
        bool failed = false)
    {
        var payloadJson = SerializePayload(payload);

        lock (_gate)
        {
            Enqueue(_broadcasts, new BroadcastEntry(
                ++_sequence,
                DateTimeOffset.UtcNow,
                eventName,
                targetKind,
                targetId,
                subscribers,
                payloadJson,
                failed));
        }
    }

    public void Clear()
    {
        lock (_gate)
        {
            _broadcasts.Clear();
            _acks.Clear();
            _componentAcks.Clear();
        }
    }

    // ── The report, read by the admin-only endpoint ──────────────────────────────

    /// <summary>
    /// The connections, and the broadcasts with the acks that belong to them. Each ack is claimed
    /// by exactly one broadcast — the earliest one, of the same event name, whose send it follows
    /// within <see cref="AckWindow"/> — so a re-sent event does not collect the first one's acks.
    /// Acks left over are reported on their own: something arrived that was never logged as sent
    /// (a send made with a plain <c>Clients.Group</c> call rather than through the notification
    /// service), which is worth knowing too.
    /// </summary>
    public InspectorReport Report(string? campaignId, int take)
    {
        BroadcastEntry[] broadcasts;
        AckEntry[] acks;
        ComponentAckEntry[] componentAcks;
        InspectorConnection[] connections;

        lock (_gate)
        {
            connections = _connections.Values
                .OrderByDescending(c => c.ConnectedAtUtc)
                .Select(c => c.Snapshot())
                .ToArray();

            broadcasts = _broadcasts.ToArray();
            acks = _acks.ToArray();
            componentAcks = _componentAcks.ToArray();
        }

        var wanted = string.IsNullOrWhiteSpace(campaignId)
            ? broadcasts
            : broadcasts.Where(b => MatchesCampaign(b, campaignId)).ToArray();

        var used = new bool[acks.Length];
        var componentUsed = new bool[componentAcks.Length];
        var rows = new List<InspectorRow>(Math.Min(wanted.Length, Math.Max(take, 0)));

        foreach (var broadcast in wanted.Reverse().Take(Math.Max(take, 0)))
        {
            var receipts = new List<InspectorAckReceipt>();

            for (var i = 0; i < acks.Length; i++)
            {
                if (used[i]) continue;

                var ack = acks[i];
                if (ack.EventName != broadcast.EventName) continue;
                if (ack.AtUtc < broadcast.AtUtc.AddMilliseconds(-100)) continue;
                if (ack.AtUtc > broadcast.AtUtc.Add(AckWindow)) continue;
                if (!AckCampaignMatches(broadcast, ack)) continue;

                used[i] = true;
                receipts.Add(new InspectorAckReceipt(
                    ack.ConnectionId,
                    ack.UserId,
                    ack.Role,
                    ack.DisplayName,
                    TakeComponents(componentAcks, componentUsed, broadcast, ack.ConnectionId),
                    (int)Math.Max(0, (ack.AtUtc - broadcast.AtUtc).TotalMilliseconds)));
            }

            rows.Add(new InspectorRow(
                broadcast.Sequence,
                broadcast.AtUtc,
                broadcast.EventName,
                broadcast.TargetKind,
                broadcast.TargetId,
                broadcast.Subscribers,
                broadcast.PayloadJson,
                broadcast.Failed,
                receipts));
        }

        var unmatched = new List<InspectorAckReceipt>();
        for (var i = 0; i < acks.Length; i++)
        {
            if (used[i]) continue;

            var ack = acks[i];
            if (!string.IsNullOrWhiteSpace(campaignId)
                && !string.Equals(ack.CampaignId, campaignId, StringComparison.OrdinalIgnoreCase)) continue;

            unmatched.Add(new InspectorAckReceipt(ack.ConnectionId, ack.UserId, ack.Role, ack.DisplayName, Array.Empty<string>(), 0));
        }

        return new InspectorReport(
            campaignId,
            DateTimeOffset.UtcNow,
            connections,
            rows,
            unmatched);
    }

    // ── Plumbing ────────────────────────────────────────────────────────────────

    /// <summary>
    /// The component names one connection reported for a broadcast: the component acks of the same
    /// event and connection that fall inside the send's own window. Each ack is claimed once.
    /// </summary>
    private static IReadOnlyList<string> TakeComponents(
        ComponentAckEntry[] componentAcks, bool[] used, BroadcastEntry broadcast, string connectionId)
    {
        List<string>? components = null;

        for (var i = 0; i < componentAcks.Length; i++)
        {
            if (used[i]) continue;

            var ack = componentAcks[i];
            if (ack.ConnectionId != connectionId) continue;
            if (ack.EventName != broadcast.EventName) continue;
            if (ack.AtUtc < broadcast.AtUtc.AddMilliseconds(-100)) continue;
            if (ack.AtUtc > broadcast.AtUtc.Add(AckWindow)) continue;

            used[i] = true;
            (components ??= new List<string>()).AddRange(ack.Components);
        }

        return components is null ? Array.Empty<string>() : components.Distinct().ToArray();
    }

    private static void Enqueue<T>(Queue<T> queue, T entry)
    {
        queue.Enqueue(entry);
        while (queue.Count > Capacity) queue.Dequeue();
    }

    private static bool IsInCampaign(ConnectionEntry entry, string? campaignId)
    {
        if (string.IsNullOrWhiteSpace(campaignId)) return false;

        lock (entry.Sync)
        {
            // Compared without regard to case: the ids arrive from a URL, a GUID and the database,
            // and a window that silently showed nothing over a difference in case would be worse
            // than useless.
            return entry.CampaignIds.Any(id => string.Equals(id, campaignId, StringComparison.OrdinalIgnoreCase));
        }
    }

    private static bool MatchesCampaign(BroadcastEntry broadcast, string campaignId) =>
        broadcast.TargetKind switch
        {
            SignalRTargets.Campaign => string.Equals(broadcast.TargetId, campaignId, StringComparison.OrdinalIgnoreCase),
            SignalRTargets.Group    => string.Equals(broadcast.TargetId, campaignId, StringComparison.OrdinalIgnoreCase),
            // A send to one user, or to everyone, is not the campaign's own business: it is shown
            // whichever campaign is being looked at.
            _                       => true,
        };

    private static bool AckCampaignMatches(BroadcastEntry broadcast, AckEntry ack) =>
        broadcast.TargetKind switch
        {
            SignalRTargets.Campaign => ack.CampaignId is null
                || string.Equals(ack.CampaignId, broadcast.TargetId, StringComparison.OrdinalIgnoreCase),
            SignalRTargets.Group    => ack.CampaignId is null
                || string.Equals(ack.CampaignId, broadcast.TargetId, StringComparison.OrdinalIgnoreCase),
            _                       => true,
        };

    private static string SerializePayload(object? payload)
    {
        if (payload is null) return string.Empty;

        try
        {
            var json = JsonSerializer.Serialize(payload, payload.GetType());
            return json.Length > PayloadJsonLimit ? json[..PayloadJsonLimit] + "…" : json;
        }
        catch (Exception)
        {
            return "(payload could not be serialized)";
        }
    }

    private sealed class ConnectionEntry
    {
        public object Sync { get; } = new();
        public required string ConnectionId { get; init; }
        public string? UserId { get; init; }
        public string? Role { get; init; }
        public string? DisplayName { get; init; }
        public DateTimeOffset ConnectedAtUtc { get; init; }
        public HashSet<string> CampaignIds { get; } = new();

        public InspectorConnection Snapshot()
        {
            lock (Sync)
            {
                return new InspectorConnection(
                    ConnectionId,
                    UserId,
                    Role,
                    DisplayName,
                    ConnectedAtUtc,
                    CampaignIds.ToArray());
            }
        }
    }

    private sealed record BroadcastEntry(
        long Sequence,
        DateTimeOffset AtUtc,
        string EventName,
        string TargetKind,
        string? TargetId,
        int Subscribers,
        string PayloadJson,
        bool Failed);

    private sealed record AckEntry(
        string EventName,
        string? CampaignId,
        string ConnectionId,
        string? UserId,
        string? Role,
        string? DisplayName,
        DateTimeOffset AtUtc);

    private sealed record ComponentAckEntry(
        string EventName,
        string? CampaignId,
        string ConnectionId,
        string[] Components,
        DateTimeOffset AtUtc);
}

/// <summary>What a broadcast was aimed at, in the words of the hub's own send calls.</summary>
public static class SignalRTargets
{
    public const string Campaign = "campaign";
    public const string Group    = "group";
    public const string User     = "user";
    public const string All      = "all";
}

/// <summary>An open hub connection, as the window shows it.</summary>
public sealed record InspectorConnection(
    string ConnectionId,
    string? UserId,
    string? Role,
    string? DisplayName,
    DateTimeOffset ConnectedAtUtc,
    IReadOnlyCollection<string> CampaignIds);

/// <summary>One client saying it received one event.</summary>
public sealed record InspectorAckReceipt(
    string ConnectionId,
    string? UserId,
    string? Role,
    string? DisplayName,
    IReadOnlyList<string> Components,
    int LatencyMs);

/// <summary>One broadcast, with the receipts that belong to it.</summary>
public sealed record InspectorRow(
    long Sequence,
    DateTimeOffset AtUtc,
    string EventName,
    string TargetKind,
    string? TargetId,
    int Subscribers,
    string PayloadJson,
    bool Failed,
    IReadOnlyList<InspectorAckReceipt> Acks);

/// <summary>The whole window: who is connected, what went out, what came back.</summary>
public sealed record InspectorReport(
    string? CampaignId,
    DateTimeOffset AtUtc,
    IReadOnlyList<InspectorConnection> Connections,
    IReadOnlyList<InspectorRow> Broadcasts,
    IReadOnlyList<InspectorAckReceipt> UnmatchedAcks);
