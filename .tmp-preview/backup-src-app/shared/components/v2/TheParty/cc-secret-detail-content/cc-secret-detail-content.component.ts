import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PlayerCardSecret } from '../../../../models/player-card.model';
import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';

@Component({
  selector: 'cc-secret-detail-content',
  standalone: true,
  imports: [CommonModule, CcLockButtonComponent],
  templateUrl: './cc-secret-detail-content.component.html',
  styleUrl: './cc-secret-detail-content.component.scss',
})
export class CcSecretDetailContentComponent {
  private http = inject(HttpClient);

  secret = input.required<PlayerCardSecret>();
  campaignId = input.required<string>();
  playerCardId = input.required<string>();
  portalColor = input<string>('#6e28d0');
  mode = input<'player' | 'dm'>('player');

  closeDrawer = output<void>();
  changed = output<void>();

  busyId = signal<string | null>(null);

  isDm = computed(() => this.mode() === 'dm');
  isPlayer = computed(() => this.mode() === 'player');

  share(): void {
    const secret = this.secret();
    if (!secret || secret.isShared || this.busyId()) return;
    this.busyId.set(secret.id);
    const sharedBy = this.isDm() ? 'DM' : 'PLAYER';
    this.http.post<PlayerCardSecret>(
      `${this.secretsUrl()}/${secret.id}/share?sharedBy=${sharedBy}`, {}
    ).subscribe({
      next: () => {
        this.busyId.set(null);
        this.changed.emit();
        this.closeDrawer.emit();
      },
      error: () => this.busyId.set(null),
    });
  }

  delete(): void {
    const secret = this.secret();
    if (!secret || !this.isDm()) return;
    this.busyId.set(secret.id);
    this.http.delete<void>(`${this.secretsUrl()}/${secret.id}`).subscribe({
      next: () => {
        this.busyId.set(null);
        this.changed.emit();
        this.closeDrawer.emit();
      },
      error: () => this.busyId.set(null),
    });
  }

  private secretsUrl(): string {
    return `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${this.playerCardId()}/secrets`;
  }
}
