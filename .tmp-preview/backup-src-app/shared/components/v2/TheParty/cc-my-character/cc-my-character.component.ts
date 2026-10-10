import { Component, OnInit, OnDestroy, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { PlayerCard, PlayerCardSecret, PlayerTrait } from '../../../../models/player-card.model';
import { AuthService } from '../../../../../core/auth/auth.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CardSpotlightService } from '../../../../../core/card-spotlight.service';
import { GridAreaChangeService } from '../../../../../core/grid-area-change.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CcSecretsWhisperRowComponent } from '../cc-secrets-whisper-row/cc-secrets-whisper-row.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CcMotivationsButtonComponent } from '../../Shared/cc-motivations-button/cc-motivations-button.component';
import { CcPortraitInputComponent } from '../../Shared/cc-portrait-input/cc-portrait-input.component';

@Component({
  selector: 'cc-my-character',
  standalone: true,
  imports: [CommonModule, CcSecretsWhisperRowComponent, CcEditButtonComponent, CcPortraitInputComponent, CcMotivationsButtonComponent],
  templateUrl: './cc-my-character.component.html',
  styleUrl: './cc-my-character.component.scss',
})
export class CcMyCharacterComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private hub = inject(CampaignHubService);
  private spotlight = inject(CardSpotlightService);
  private areaChange = inject(GridAreaChangeService);
  private shellSvc = inject(CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  private readonly mark = publishGridAreaMark('middle-right', 'character', {
    title: () => ['My Character'],
    icon: { path: '/my_character_icon.svg', width: 32, height: 32 },
  });

  readonly playerCard = signal<PlayerCard | null>(null);
  readonly traits = signal<PlayerTrait[]>([]);
  readonly secrets = signal<PlayerCardSecret[]>([]);
  readonly activeTab = signal<'character' | 'secrets'>('character');

  readonly goals = computed(() => this.traits().filter(t => t.traitType === 'GOAL'));
  readonly fears = computed(() => this.traits().filter(t => t.traitType === 'FEAR'));
  readonly flaws = computed(() => this.traits().filter(t => t.traitType === 'FLAW'));

  private hubSubscriptions: Subscription[] = [];
  private pendingDeliveredContent = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPlayerCard();

    this.hubSubscriptions.push(
      this.hub.on('SecretDelivered', 'cc-my-character', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        const myUserId = this.auth.currentUser()?.id;
        if (!myUserId || event.playerUserId !== myUserId) return;
        // The area's own notice is raised at the change, aimed at this player (see the server's
        // BroadcastGridAreaNoticeAsync), so nothing is lit from here.
        this.pendingDeliveredContent.set(event.content);
        this.loadSecrets();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('PlayerSecretChanged', 'cc-my-character', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.spotlight.reveal(event.secretId);
        this.areaChange.notify('middle-right');
        this.loadSecrets();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('PlayerSecretDeleted', 'cc-my-character', event => {
        if (!event) return;
        const myCardId = this.playerCard()?.id;
        if (!myCardId || event.playerCardId !== myCardId) return;
        this.secrets.update(list => list.filter(s => s.id !== event.secretId));
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.playerCharacterUpdated.subscribe(() => {
        this.loadPlayerCard();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.secretsChanged.subscribe(() => {
        this.loadSecrets();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('PlayerCardTraitsChanged', 'cc-my-character', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        const myCardId = this.playerCard()?.id;
        if (!myCardId || event.playerCardId !== myCardId) return;
        this.traits.set(event.traits);
      })
    );
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.forEach(s => s.unsubscribe());
  }

  openInfoEditor(): void {
    this.shellSvc.openMyCharacterInfoDrawer(this.campaignId(), this.portalColor());
  }

  openMotivationsEditor(): void {
    this.shellSvc.openMyCharacterMotivationsDrawer(this.campaignId(), this.portalColor());
  }

  onSecretsChange(list: PlayerCardSecret[]): void {
    this.secrets.set(list);
  }

  raceClass(card: PlayerCard): string {
    return [card.race, card.class].filter(Boolean).join(' · ');
  }

  private loadPlayerCard(): void {
    this.http.get<PlayerCard>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/mine`
    ).subscribe(card => {
      this.playerCard.set(card);
      this.loadTraits(card.id);
      this.loadSecrets();
    });
  }

  private loadTraits(playerCardId: string): void {
    this.http.get<PlayerTrait[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/traits`
    ).subscribe(traits => this.traits.set(traits));
  }

  private loadSecrets(): void {
    const playerCardId = this.playerCard()?.id;
    if (!playerCardId) return;
    this.http.get<PlayerCardSecret[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/secrets`
    ).subscribe(list => {
      this.secrets.set(list);
      const pending = this.pendingDeliveredContent();
      if (pending) {
        const match = list.find(s => s.content === pending);
        if (match) {
          this.spotlight.reveal(match.id);
          this.areaChange.notify('middle-right');
        }
        this.pendingDeliveredContent.set(null);
      }
    });
  }
}
