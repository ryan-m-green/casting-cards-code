import { Component, OnInit, OnDestroy, input, output, signal, computed, inject, linkedSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
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

@Component({
  selector: 'cc-secrets-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-secrets-manager.component.html',
  styleUrl: './cc-secrets-manager.component.scss'
})
export class CcSecretsManagerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);

  private readonly hubSubscriptions: Subscription[] = [];

  readonly secrets = input<CampaignSecret[] | PlayerCardSecret[]>([]);

  readonly cardType = input<SecretCardType>('location');

  readonly campaignId = input<string>('');

  readonly instanceId = input<string>('');

  readonly context = input<'journal' | 'campaign'>('campaign');
  readonly isDm = input<boolean>(false);
  readonly allowAdd = input<boolean>(true);
  readonly allowDelete = input<boolean>(true);
  readonly allowToggle = input<boolean>(true);

  readonly reveal = output<ManagedSecret>();
  readonly reseal = output<ManagedSecret>();
  readonly delete = output<ManagedSecret>();
  readonly add = output<ManagedSecret>();
  readonly secretsChange = output<ManagedSecret[]>();

  readonly isPlayerMode = computed(() => this.cardType() === 'player');
  readonly isCampaignContext = computed(() => this.context() === 'campaign');

  private readonly fetchedSecrets = signal<CampaignSecret[] | PlayerCardSecret[] | null>(null);

  readonly currentSecrets = linkedSignal<ManagedSecret[]>(() =>
    (this.fetchedSecrets() ?? this.secrets()).map(s => this.toManaged(s))
  );

  readonly visibleSecrets = computed<ManagedSecret[]>(() => {
    const list = this.currentSecrets();
    if (this.isDm() || this.isPlayerMode()) return list;
    return list.filter(s => s.active);
  });

  adding = signal(false);
  newSecretContent = signal('');

  constructor() {
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

  ngOnInit(): void {
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

    this.hubSubscriptions.push(
      this.hub.on('PlayerSecretRevealed', 'cc-secrets-manager', onThisCard)
    );

    this.hubSubscriptions.push(
      this.hub.on('SecretResealed', 'cc-secrets-manager', onThisCard)
    );

    this.hubSubscriptions.push(
      this.hub.on('SecretCreated', 'cc-secrets-manager', onThisCard)
    );

    this.hubSubscriptions.push(
      this.hub.on('SecretDeleted', 'cc-secrets-manager', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        refresh();
      })
    );
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

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

  canRevealToggle(): boolean {
    return !this.isPlayerMode() && this.isDm() && this.allowToggle();
  }

  canShare(secret: ManagedSecret): boolean {
    return this.isPlayerMode() && this.allowToggle() && !secret.active;
  }

  statusLabel(secret: ManagedSecret): string {
    if (this.isPlayerMode()) return secret.active ? 'Shared' : 'Private';
    return secret.active ? 'Revealed' : 'Sealed';
  }

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

  private secretInstanceId(secret: CampaignSecret, cardType: SecretCardType): string | null {
    switch (cardType) {
      case 'cast': return secret.castInstanceId;
      case 'location': return secret.locationInstanceId;
      case 'sublocation': return secret.sublocationInstanceId;
      default: return null;
    }
  }

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
