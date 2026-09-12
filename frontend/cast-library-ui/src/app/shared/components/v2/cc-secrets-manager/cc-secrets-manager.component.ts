import { Component, input, output, signal, computed, inject, linkedSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  CampaignSecret,
  ManagedSecret,
  SecretCardType,
  SECRET_ENTITY_TYPE,
  isPlayerSecret
} from '../../../models/secret.model';
import { PlayerCardSecret } from '../../../models/player-card.model';
import { environment } from '../../../../../environments/environment';

/**
 * Shared, card-type aware secrets manager.
 *
 * Tell it which kind of card it manages via `[cardType]` and it talks to the
 * right secrets API on its own:
 *
 *   Campaign cards (location / sublocation / cast / faction):
 *     POST   api/campaigns/{campaignId}/secrets                  (add)
 *     POST   api/campaigns/{campaignId}/secrets/{id}/reveal      (reveal)
 *     PATCH  api/campaigns/{campaignId}/secrets/{id}/reseal      (reseal)
 *     DELETE api/campaigns/{campaignId}/secrets/{id}             (delete)
 *
 *   Player cards (player):
 *     POST   api/campaigns/{campaignId}/player-cards/{id}/secrets             (deliver)
 *     POST   api/campaigns/{campaignId}/player-cards/{id}/secrets/{sid}/share (share)
 *     DELETE api/campaigns/{campaignId}/player-cards/{id}/secrets/{sid}       (delete)
 *
 * Secrets render as a single-column list and new ones appear immediately once
 * the server confirms the write.
 *
 * NOTE: faction storage is not implemented on the backend yet; the faction card
 * type is plumbed through so it becomes a drop-in once the API supports it.
 */
@Component({
  selector: 'cc-secrets-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-secrets-manager.component.html',
  styleUrl: './cc-secrets-manager.component.scss'
})
export class CcSecretsManagerComponent {
  private http = inject(HttpClient);

  /** Secrets currently associated with the card (campaign or player shapes). */
  readonly secrets = input<CampaignSecret[] | PlayerCardSecret[]>([]);

  /**
   * Which kind of card these secrets belong to. `player` switches the component
   * to the player-card secrets API (deliver/share); the rest use campaign secrets.
   */
  readonly cardType = input<SecretCardType>('location');

  /** Campaign the card lives in; required for every write. */
  readonly campaignId = input<string>('');

  /** Instance id of the card (player-card id when cardType is 'player'). */
  readonly instanceId = input<string>('');

  readonly context = input<'journal' | 'campaign'>('campaign');
  readonly isDm = input<boolean>(false);
  readonly allowAdd = input<boolean>(true);
  readonly allowDelete = input<boolean>(true);
  readonly allowToggle = input<boolean>(true);

  // Action notifications — the component performs the writes itself.
  readonly reveal = output<ManagedSecret>();
  readonly reseal = output<ManagedSecret>();
  readonly delete = output<ManagedSecret>();
  readonly add = output<ManagedSecret>();
  /** Emits the full list whenever it changes (add / reveal / reseal / share / delete). */
  readonly secretsChange = output<ManagedSecret[]>();

  readonly isPlayerMode = computed(() => this.cardType() === 'player');
  readonly isCampaignContext = computed(() => this.context() === 'campaign');

  /**
   * Secrets loaded from the server for this card (raw API shape). When present it
   * takes priority over the `secrets` input so previously-persisted secrets
   * always reappear, even when the caller opened the panel with an empty list.
   */
  private readonly fetchedSecrets = signal<CampaignSecret[] | PlayerCardSecret[] | null>(null);

  /**
   * Writable copy of the card's secrets (normalized across card types) so adds /
   * reveals / shares / deletes show immediately. Re-seeds whenever the server
   * list (or the `secrets` input) changes.
   */
  readonly currentSecrets = linkedSignal<ManagedSecret[]>(() =>
    (this.fetchedSecrets() ?? this.secrets()).map(s => this.toManaged(s))
  );

  adding = signal(false);
  newSecretContent = signal('');

  constructor() {
    // Load the card's persisted secrets straight from the API whenever the card
    // identity changes. The `secrets` input is only a seed/fallback (callers such
    // as cc-card-navigation pass an empty array).
    effect(() => {
      const campaignId = this.campaignId();
      const instanceId = this.instanceId();
      const cardType = this.cardType();

      if (!campaignId || !instanceId) {
        this.fetchedSecrets.set(null);
        return;
      }

      this.loadSecrets(campaignId, instanceId, cardType);
    });
  }

  /**
   * Add is offered whenever the DM can persist the secret. The manager writes to
   * the API directly, so it does not depend on the panel's edit mode.
   */
  readonly canAdd = computed(() =>
    this.isDm() &&
    this.allowAdd() &&
    !!this.campaignId() &&
    !!this.instanceId()
  );

  private get secretsUrl(): string {
    return this.isPlayerMode()
      ? `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${this.instanceId()}/secrets`
      : `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets`;
  }

  // ── Template helpers ────────────────────────────────────────────────────────

  /** Campaign mode: the DM can flip Reveal/Reseal (independent of edit mode). */
  canRevealToggle(): boolean {
    return !this.isPlayerMode() && this.isDm() && this.allowToggle();
  }

  /** Player mode: a secret that is not yet shared can be shared with the party. */
  canShare(secret: ManagedSecret): boolean {
    return this.isPlayerMode() && this.allowToggle() && !secret.active;
  }

  statusLabel(secret: ManagedSecret): string {
    if (this.isPlayerMode()) return secret.active ? 'Shared' : 'Private';
    return secret.active ? 'Revealed' : 'Sealed';
  }

  onToggle(secret: ManagedSecret): void {
    if (!this.isDm() || !this.allowToggle() || !this.campaignId()) return;
    if (secret.active) {
      this.resealSecret(secret);
    } else {
      this.revealSecret(secret);
    }
  }

  onShare(secret: ManagedSecret): void {
    if (!this.isPlayerMode() || !this.allowToggle() || !this.campaignId()) return;
    const sharedBy = this.isDm() ? 'DM' : 'PLAYER';

    this.http.post<PlayerCardSecret>(
      `${this.secretsUrl}/${secret.id}/share?sharedBy=${sharedBy}`, {}
    ).subscribe({
      next: updated => {
        this.patch(secret.id, {
          active: true,
          activeAt: updated?.sharedAt ?? new Date().toISOString(),
          sharedBy: updated?.sharedBy ?? sharedBy
        });
        this.reveal.emit({ ...secret, active: true });
        this.secretsChange.emit(this.currentSecrets());
      },
      error: err => console.error('[cc-secrets-manager] Failed to share secret', err)
    });
  }

  onDelete(secret: ManagedSecret): void {
    if (!this.isDm() || !this.allowDelete() || !this.campaignId()) return;

    this.http.delete<void>(`${this.secretsUrl}/${secret.id}`).subscribe({
      next: () => {
        this.currentSecrets.update(list => list.filter(s => s.id !== secret.id));
        this.delete.emit(secret);
        this.secretsChange.emit(this.currentSecrets());
      },
      error: err => console.error('[cc-secrets-manager] Failed to delete secret', err)
    });
  }

  startAdding(): void {
    this.newSecretContent.set('');
    this.adding.set(true);
  }

  cancelAdding(): void {
    this.adding.set(false);
  }

  confirmAdd(): void {
    const content = this.newSecretContent().trim();
    if (!content || !this.canAdd()) return;

    const body = this.isPlayerMode()
      ? { content }
      : { instanceId: this.instanceId(), entityType: this.entityType(), content };

    this.http.post<CampaignSecret | PlayerCardSecret>(this.secretsUrl, body).subscribe({
      next: created => {
        const managed = this.toManaged(created);
        this.currentSecrets.update(list => [...list, managed]);
        this.add.emit(managed);
        this.secretsChange.emit(this.currentSecrets());
        this.newSecretContent.set('');
        this.adding.set(false);
      },
      error: err => console.error('[cc-secrets-manager] Failed to add secret', err)
    });
  }

  private revealSecret(secret: ManagedSecret): void {
    this.http.post<CampaignSecret>(`${this.secretsUrl}/${secret.id}/reveal`, {}).subscribe({
      next: updated => {
        this.patch(secret.id, { active: true, activeAt: updated?.revealedAt ?? null });
        this.reveal.emit(secret);
        this.secretsChange.emit(this.currentSecrets());
      },
      error: err => console.error('[cc-secrets-manager] Failed to reveal secret', err)
    });
  }

  private resealSecret(secret: ManagedSecret): void {
    this.http.patch<CampaignSecret>(`${this.secretsUrl}/${secret.id}/reseal`, {}).subscribe({
      next: () => {
        this.patch(secret.id, { active: false, activeAt: null });
        this.reseal.emit(secret);
        this.secretsChange.emit(this.currentSecrets());
      },
      error: err => console.error('[cc-secrets-manager] Failed to reseal secret', err)
    });
  }

  private patch(id: string, changes: Partial<ManagedSecret>): void {
    this.currentSecrets.update(list =>
      list.map(s => (s.id === id ? { ...s, ...changes } : s))
    );
  }

  private entityType(): 'Location' | 'Sublocation' | 'Cast' | 'Faction' {
    return SECRET_ENTITY_TYPE[this.cardType() as Exclude<SecretCardType, 'player'>];
  }

  /**
   * Fetch this card's persisted secrets from the API so they show even when the
   * caller supplied no list. (Player cards are loaded by their own panel.)
   */
  private loadSecrets(campaignId: string, instanceId: string, cardType: SecretCardType): void {
    if (this.isPlayerMode()) return;

    this.http.get<CampaignSecret[]>(
      `${environment.apiUrl}/api/campaign/${campaignId}/secrets`
    ).subscribe({
      next: list => {
        const scoped = list.filter(s => this.secretInstanceId(s, cardType) === instanceId);
        this.fetchedSecrets.set(scoped);
      },
      error: err => console.error('[cc-secrets-manager] Failed to load secrets', err)
    });
  }

  /** The instance id a campaign secret is attached to, for the given card type. */
  private secretInstanceId(secret: CampaignSecret, cardType: SecretCardType): string | null {
    switch (cardType) {
      case 'cast': return secret.castInstanceId;
      case 'location': return secret.locationInstanceId;
      case 'sublocation': return secret.sublocationInstanceId;
      default: return null;
    }
  }

  /** Normalize a campaign or player secret into the shared view model. */
  private toManaged(secret: CampaignSecret | PlayerCardSecret): ManagedSecret {
    if (isPlayerSecret(secret)) {
      return {
        id: secret.id,
        content: secret.content,
        active: secret.isShared,
        activeAt: secret.sharedAt ?? null,
        sharedBy: secret.sharedBy ?? null
      };
    }
    return {
      id: secret.id,
      content: secret.content,
      active: secret.isRevealed,
      activeAt: secret.revealedAt,
      sharedBy: null
    };
  }
}
