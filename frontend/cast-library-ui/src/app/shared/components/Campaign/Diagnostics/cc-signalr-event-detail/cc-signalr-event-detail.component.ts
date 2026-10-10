import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectorAckReceipt, InspectorConnection, InspectorRow } from '../cc-signalr-inspector/cc-signalr-inspector.component';

@Component({
  selector: 'cc-signalr-event-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-signalr-event-detail.component.html',
  styleUrl: './cc-signalr-event-detail.component.scss',
})
export class CcSignalrEventDetailComponent {
  readonly row = input<InspectorRow | null>(null);

  readonly dmUserId = input<string>('');

  readonly connections = input<readonly InspectorConnection[]>([]);

  readonly acks = computed<readonly InspectorAckReceipt[]>(() => this.row()?.acks ?? []);

  readonly copied = signal(false);

  copyPayload(): void {
    const json = this.row()?.payloadJson;
    if (!json) return;

    navigator.clipboard.writeText(this.pretty(json));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  roleLabel(role: string | null): string {
    return role && role.length ? role : 'no role';
  }

  displayRole(userId: string | null, accountRole: string | null): string {
    const dm = this.dmUserId();
    if (!dm) return this.roleLabel(accountRole);

    return userId && userId.toLowerCase() === dm.toLowerCase() ? 'DM' : 'player';
  }

  nameOf(user: { userId: string | null; displayName: string | null }): string {
    return user.displayName?.trim() || this.shortId(user.userId);
  }

  isPlayerSocket(connection: { userId: string | null; role: string | null }): boolean {
    return this.displayRole(connection.userId, connection.role).toLowerCase() === 'player';
  }

  sinceLabel(iso: string): string {
    const from = new Date(iso).getTime();
    if (Number.isNaN(from)) return '';

    const seconds = Math.max(0, Math.round((Date.now() - from) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  componentsOf(receipt: InspectorAckReceipt): string {
    return receipt.components?.length ? receipt.components.join(', ') : '—';
  }

  shortId(value: string | null): string {
    if (!value) return 'unknown';
    return value.length > 13 ? value.slice(0, 8) + '…' : value;
  }

  shortTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const pad = (value: number, width = 2) => String(value).padStart(width, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
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
