import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/auth/auth.service';

/** How often the window re-reads the server: live enough to watch, cheap enough to leave open. */
const POLL_MS = 1200;

/**
 * How far the wait grows while the server is not answering. A failed request is logged by the
 * browser itself, whatever this code does with it, so a window that kept asking every beat against
 * a server that is down — or a build without the endpoint — would be the thing flooding the console
 * it exists to help read.
 */
const MAX_POLL_MS = 15000;

/** One connection the hub has open. */
export interface InspectorConnection {
  connectionId: string;
  userId: string | null;
  role: string | null;
  connectedAtUtc: string;
  campaignIds: string[];
}

/** One client saying it received one event. */
export interface InspectorAckReceipt {
  connectionId: string;
  userId: string | null;
  role: string | null;
  latencyMs: number;
}

/** One broadcast, with the receipts that belong to it. */
export interface InspectorRow {
  sequence: number;
  atUtc: string;
  eventName: string;
  targetKind: string;
  targetId: string | null;
  subscribers: number;
  payloadJson: string;
  failed: boolean;
  acks: InspectorAckReceipt[];
}

/** The whole window, as the admin-only endpoint serves it. */
export interface InspectorReport {
  campaignId: string | null;
  atUtc: string;
  connections: InspectorConnection[];
  broadcasts: InspectorRow[];
  unmatchedAcks: InspectorAckReceipt[];
}

/**
 * cc-signalr-inspector
 *
 * The admin's window on the campaign hub: who is connected right now, every event that was
 * broadcast, and — the part that cannot be seen from one machine otherwise — which of those
 * events a receiving client said it got back.
 *
 * It is the front half of SignalRInspector on the server (see that class, and the hub's
 * ReportEventAck that the receiving clients call): the server keeps the log, this reads it on a
 * timer and draws it. Rows are coloured by what they mean, not by what they are:
 *
 *   green  — sent, and at least one client said it arrived
 *   amber  — sent, nobody answered: the event left, and no one was listening (or nothing acked)
 *   grey   — sent to an empty room: no connections were in the target when it went out
 *   red    — the send itself threw
 *
 * Admin-only at every layer: the endpoint behind it refuses anyone else, and the panel refuses to
 * ask (see the `isAdmin` guard in `start`).
 */
@Component({
  selector: 'cc-signalr-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-signalr-inspector.component.html',
  styleUrl: './cc-signalr-inspector.component.scss',
})
export class CcSignalrInspectorComponent implements OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /** The campaign whose traffic is being looked at. */
  readonly campaignId = input<string>('');

  report = signal<InspectorReport | null>(null);
  error = signal('');
  paused = signal(false);
  /** Narrow the feed to this campaign's own broadcasts: a per-user or global send still shows. */
  campaignOnly = signal(true);
  filter = signal('');
  expanded = signal<ReadonlySet<number>>(new Set<number>());

  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Consecutive failed reads, which is what the wait between reads grows on. */
  private failures = 0;

  // ── What the panel draws ──────────────────────────────────────────────────────

  readonly connections = computed(() => this.report()?.connections ?? []);
  readonly rows = computed(() => this.report()?.broadcasts ?? []);
  readonly unmatchedAcks = computed(() => this.report()?.unmatchedAcks ?? []);

  readonly visibleConnections = computed(() => {
    if (!this.campaignOnly()) return this.connections();
    // Case-insensitive for the same reason the server is: these ids travel as URLs and GUIDs.
    const campaignId = this.campaignId().toLowerCase();
    return this.connections().filter(c => c.campaignIds.some(id => id.toLowerCase() === campaignId));
  });

  readonly visibleRows = computed(() => {
    const term = this.filter().trim().toLowerCase();
    if (!term) return this.rows();

    return this.rows().filter(row =>
      row.eventName.toLowerCase().includes(term) ||
      (row.targetId ?? '').toLowerCase().includes(term));
  });

  readonly playerCount = computed(() =>
    this.visibleConnections().filter(c => (c.role ?? '').toLowerCase() === 'player').length);

  readonly gmCount = computed(() =>
    this.visibleConnections().filter(c => (c.role ?? '').toLowerCase() !== 'player').length);

  readonly failedCount = computed(() => this.rows().filter(r => r.failed).length);

  /** Sends that left with someone listening and came back with no word: the rows to look at. */
  readonly unansweredCount = computed(() =>
    this.rows().filter(r => !r.failed && r.subscribers > 0 && r.acks.length === 0).length);

  // ── Life ─────────────────────────────────────────────────────────────────────

  constructor() {
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private start(): void {
    if (!this.auth.isAdmin()) {
      // The endpoint refuses anyone else; there is no reason to ask it.
      this.error.set('The SignalR inspector is the Admin\u2019s own window.');
      return;
    }

    this.schedule(0);
  }

  private stop(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** Queues the next read. Every path ends in another schedule, so the window keeps its own beat. */
  private schedule(delayMs: number): void {
    this.stop();
    this.timer = setTimeout(() => this.poll(), delayMs);
  }

  private poll(): void {
    // A tab nobody is looking at, or a paused window, has no reason to ask.
    if (this.paused() || document.hidden) {
      this.schedule(POLL_MS);
      return;
    }

    this.http.get<InspectorReport>(`${environment.apiUrl}/api/admin/signalr/state`, {
      params: { campaignId: this.campaignOnly() ? this.campaignId() : '', take: 200 },
    }).subscribe({
      next: report => {
        this.failures = 0;
        this.report.set(report);
        this.error.set('');
        this.schedule(POLL_MS);
      },
      error: err => {
        this.failures += 1;
        this.error.set(err?.status === 403
          ? 'This account is not an Admin, so the hub will not open its window.'
          : `Could not read the inspector endpoint (${err?.status ?? 'no answer'}) — is the API running, `
            + 'and is it the build that has this endpoint? Retrying, more slowly each time.');
        this.schedule(Math.min(POLL_MS * 2 ** this.failures, MAX_POLL_MS));
      },
    });
  }

  // ── The tools above the feed ─────────────────────────────────────────────────

  toggleRow(sequence: number): void {
    const next = new Set(this.expanded());
    if (next.has(sequence)) next.delete(sequence); else next.add(sequence);
    this.expanded.set(next);
  }

  togglePaused(): void {
    this.paused.update(v => !v);
  }

  toggleCampaignOnly(): void {
    this.campaignOnly.update(v => !v);
  }

  clear(): void {
    this.http.post(`${environment.apiUrl}/api/admin/signalr/clear`, {}).subscribe({
      next: () => this.report.update(r => (r ? { ...r, broadcasts: [], unmatchedAcks: [] } : r)),
      error: () => {},
    });
  }

  // ── Reading a row ────────────────────────────────────────────────────────────

  /** What the send means, in one word for the eye (see the row colours in the styles). */
  verdict(row: InspectorRow): 'failed' | 'answered' | 'unanswered' | 'empty' {
    if (row.failed) return 'failed';
    if (row.acks.length > 0) return 'answered';
    return row.subscribers > 0 ? 'unanswered' : 'empty';
  }

  ackLabel(row: InspectorRow): string {
    if (!row.acks.length) return row.subscribers > 0 ? 'no receipt' : '—';

    const fastest = Math.min(...row.acks.map(a => a.latencyMs));
    return `${row.acks.length} receipt${row.acks.length === 1 ? '' : 's'} · ${fastest} ms`;
  }

  shortTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const pad = (value: number, width = 2) => String(value).padStart(width, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  /**
   * How long a connection has been open, measured against the moment the report was taken rather
   * than against the clock now.
   *
   * The clock is the wrong reference for a method the template calls: it moves between Angular's
   * two development-mode checks of the same expression, so the label flips 15s → 16s mid-check and
   * the change detector throws NG0100. The report's own `atUtc` only changes when a new report
   * arrives, so the answer is stable within a check and still ticks with every poll.
   */
  sinceLabel(iso: string): string {
    const reference = this.report()?.atUtc;
    if (!reference) return '';

    const from = new Date(iso).getTime();
    const to = new Date(reference).getTime();
    if (Number.isNaN(from) || Number.isNaN(to)) return '';

    const seconds = Math.max(0, Math.round((to - from) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  /** A connection or user id, short enough for a row. */
  shortId(value: string | null): string {
    if (!value) return 'unknown';
    return value.length > 13 ? value.slice(0, 8) + '…' : value;
  }

  roleLabel(role: string | null): string {
    return role && role.length ? role : 'no role';
  }

  pretty(json: string): string {
    if (!json) return '(no payload)';
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }
}
