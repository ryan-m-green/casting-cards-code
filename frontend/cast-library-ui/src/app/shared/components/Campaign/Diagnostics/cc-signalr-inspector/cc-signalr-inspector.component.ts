import { Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/auth/auth.service';

const POLL_MS = 1200;

const MAX_POLL_MS = 15000;

export interface InspectorConnection {
  connectionId: string;
  userId: string | null;
  role: string | null;
  displayName: string | null;
  connectedAtUtc: string;
  campaignIds: string[];
}

export interface InspectorAckReceipt {
  connectionId: string;
  userId: string | null;
  role: string | null;
  displayName: string | null;
  components: string[];
  latencyMs: number;
}

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

export interface InspectorReport {
  campaignId: string | null;
  atUtc: string;
  connections: InspectorConnection[];
  broadcasts: InspectorRow[];
  unmatchedAcks: InspectorAckReceipt[];
}

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

  readonly campaignId = input<string>('');

  readonly dmUserId = input<string>('');

  readonly openEvent = output<InspectorRow>();

  readonly connectionsChanged = output<readonly InspectorConnection[]>();

  report = signal<InspectorReport | null>(null);
  error = signal('');
  paused = signal(false);
  campaignOnly = signal(true);
  filter = signal('');

  private timer: ReturnType<typeof setTimeout> | null = null;

  private failures = 0;

  readonly connections = computed(() => this.report()?.connections ?? []);
  readonly rows = computed(() => this.report()?.broadcasts ?? []);
  readonly unmatchedAcks = computed(() => this.report()?.unmatchedAcks ?? []);

  readonly visibleConnections = computed(() => {
    if (!this.campaignOnly()) return this.connections();
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
    this.visibleConnections().filter(c => this.isPlayerSocket(c)).length);

  readonly gmCount = computed(() =>
    this.visibleConnections().filter(c => !this.isPlayerSocket(c)).length);

  readonly failedCount = computed(() => this.rows().filter(r => r.failed).length);

  readonly unansweredCount = computed(() =>
    this.rows().filter(r => !r.failed && r.subscribers > 0 && r.acks.length === 0).length);

  constructor() {
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private start(): void {
    if (!this.auth.isAdmin()) {
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

  private schedule(delayMs: number): void {
    this.stop();
    this.timer = setTimeout(() => this.poll(), delayMs);
  }

  private poll(): void {
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
        this.connectionsChanged.emit(this.visibleConnections());
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

  componentsFor(row: InspectorRow): string {
    const names = new Set<string>();
    for (const ack of row.acks) for (const name of ack.components ?? []) names.add(name);

    return names.size ? [...names].join(', ') : '—';
  }

  shortTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const pad = (value: number, width = 2) => String(value).padStart(width, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

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

  shortId(value: string | null): string {
    if (!value) return 'unknown';
    return value.length > 13 ? value.slice(0, 8) + '…' : value;
  }

  nameOf(user: { userId: string | null; displayName: string | null }): string {
    return user.displayName?.trim() || this.shortId(user.userId);
  }

  roleLabel(role: string | null): string {
    return role && role.length ? role : 'no role';
  }

  displayRole(userId: string | null, accountRole: string | null): string {
    const dm = this.dmUserId();
    if (!this.campaignOnly() || !dm) return this.roleLabel(accountRole);

    return userId && userId.toLowerCase() === dm.toLowerCase() ? 'DM' : 'player';
  }

  isPlayerSocket(connection: { userId: string | null; role: string | null }): boolean {
    return this.displayRole(connection.userId, connection.role).toLowerCase() === 'player';
  }
}
