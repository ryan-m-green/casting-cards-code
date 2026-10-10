import { Component, input, output, signal, computed, inject, linkedSignal, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  CampaignSecret,
  ManagedSecret,
  SecretCardType,
  SECRET_ENTITY_TYPE,
  isPlayerSecret
} from '../../../../models/secret.model';
import { PlayerCardSecret } from '../../../../models/player-card.model';
import { CampaignDetail } from '../../../../models/campaign.model';
import { environment } from '../../../../../../environments/environment';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';

/**
 * Shared, card-type aware secrets manager.
 *
 * Tell it which kind of card it manages via `[cardType]` and it talks to the
 * right secrets API on its own:
 *
 *   Campaign cards (location / sublocation / cast / faction):
 *     POST   api/campaign/{campaignId}/secrets                  (add)
 *     POST   api/campaign/{campaignId}/secrets/{id}/reveal      (reveal)
 *     PATCH  api/campaign/{campaignId}/secrets/{id}/reseal      (reseal)
 *     DELETE api/campaign/{campaignId}/secrets/{id}             (delete)
 *
 *   The reveal is the campaign's own door rather than a card's (see CampaignController): one
 *   endpoint opens a secret whichever card it hangs on.
 *
 *   Player cards (player):
 *     POST   api/campaigns/{campaignId}/player-cards/{id}/secrets             (deliver)
 *     POST   api/campaigns/{campaignId}/player-cards/{id}/secrets/{sid}/share (share)
 *     DELETE api/campaigns/{campaignId}/player-cards/{id}/secrets/{sid}       (delete)
 *
 * Secrets render as a single-column list and new ones appear immediately once
 * the server confirms the write.
 *
 * The section is also woken by the campaign's own secret traffic (the API's
 * PlayerSecretRevealed / SecretResealed / SecretCreated / SecretDeleted), so a
 * secret the GM reveals is in the players' section the moment it is written —
 * without a reload — and a change made anywhere else lands here too.
 *
 * A GM is handed the card as it stands, sealed and revealed alike. Anyone else
 * is handed only the secrets revealed to the players: theirs are read from the
 * player's own view of the campaign, which the server already narrows that way.
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
  private hub = inject(CampaignHubService);
  private destroyRef = inject(DestroyRef);

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

  /**
   * The secrets the viewer is handed.
   *
   * A GM reads the card as it stands — sealed and revealed alike. Anyone else is shown only the
   * secrets revealed to the players: a player must never be handed a secret the GM has not opened
   * (the read behind this already comes from the player's own view of the campaign, see
   * `loadSecrets`; this is the same rule held here so a list seeded by the caller cannot slip one
   * past it). Player cards are left alone: a player's own held secrets are theirs to read.
   */
  readonly visibleSecrets = computed<ManagedSecret[]>(() => {
    const list = this.currentSecrets();
    if (this.isDm() || this.isPlayerMode()) return list;
    return list.filter(s => s.active);
  });

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

    this.followCardSecrets();
  }

  /**
   * Follow the campaign's secret traffic, so the section stays in step with the server without a
   * reload.
   *
   * The write itself is already broadcast to the campaign's group (the API's PlayerSecretRevealed /
   * SecretResealed / SecretCreated / SecretDeleted), and this is the section answering its own card's
   * events: a GM's reveal lands in the players' section the moment it is written — that is what makes
   * the secret appear to them — and a change made from anywhere else (another panel, another tab, a
   * reseal, a delete) lands here. Only this card's events are worth a re-read; a delete carries no
   * instance, so it is taken on the campaign and the re-read decides.
   */
  private followCardSecrets(): void {
    const refresh = () => {
      const campaignId = this.campaignId();
      const instanceId = this.instanceId();

      if (!campaignId || !instanceId || this.isPlayerMode()) return;

      this.loadSecrets(campaignId, instanceId, this.cardType());
    };

    const onThisCard = (
      event: { campaignId: string; castInstanceId?: string | null; locationInstanceId?: string | null; sublocationInstanceId?: string | null } | null
    ) => {
      if (!event || event.campaignId !== this.campaignId()) return;
      if (this.namesThisCard(event)) refresh();
    };

    this.hub.secretRevealed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(onThisCard);
    this.hub.secretResealed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(onThisCard);
    this.hub.secretCreated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(onThisCard);

    this.hub.secretDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      refresh();
    });
  }

  /** Whether a hub event names one of this card's own secrets. */
  private namesThisCard(event: {
    castInstanceId?: string | null;
    locationInstanceId?: string | null;
    sublocationInstanceId?: string | null;
  }): boolean {
    const instanceId = this.instanceId();
    if (!instanceId) return false;

    switch (this.cardType()) {
      case 'cast': return event.castInstanceId === instanceId;
      case 'location': return event.locationInstanceId === instanceId;
      case 'sublocation': return event.sublocationInstanceId === instanceId;
      default: return false;
    }
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
      : `${environment.apiUrl}/api/campaign/${this.campaignId()}/secrets`;
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

  /**
   * What an empty section says, which depends on whose section it is: the GM is told how to keep a
   * secret, a player that none has been opened to them, and a player's own card that none has been
   * delivered yet.
   */
  readonly emptyText = computed(() => {
    if (this.isPlayerMode()) return 'No secrets yet. Deliver one to keep it private to this player.';
    if (!this.isDm()) return 'No secrets have been revealed to you here yet.';
    return 'No secrets yet. Add one to keep it hidden from players.';
  });

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
   *
   * The GM reads the card as the campaign holds it — sealed and revealed alike — from the
   * campaign's own secrets endpoint. Anyone else is handed the player's view of the campaign
   * instead, which the server already narrows to the secrets revealed to them on cards they can
   * see: that is what puts a GM's reveal in front of the players, and what keeps a sealed secret
   * from ever leaving the API for them.
   */
  private loadSecrets(campaignId: string, instanceId: string, cardType: SecretCardType): void {
    if (this.isPlayerMode()) return;

    if (!this.isDm()) {
      this.http.get<CampaignDetail>(
        `${environment.apiUrl}/api/campaigns/${campaignId}/player`
      ).subscribe({
        next: campaign => {
          const scoped = (campaign?.secrets ?? [])
            .filter(s => this.secretInstanceId(s, cardType) === instanceId);
          this.fetchedSecrets.set(scoped);
        },
        error: err => console.error('[cc-secrets-manager] Failed to load secrets', err)
      });
      return;
    }

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
