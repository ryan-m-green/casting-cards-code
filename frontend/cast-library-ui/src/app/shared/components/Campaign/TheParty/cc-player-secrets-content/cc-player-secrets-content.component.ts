import { Component, inject, signal, Input, viewChild, ElementRef, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PlayerCardSecret, PlayerCardWithDetails, PlayerTrait } from '../../../../models/player-card.model';
import { CcSecretsWhisperRowComponent } from '../cc-secrets-whisper-row/cc-secrets-whisper-row.component';
import { CcPortraitInputComponent } from '../../../Shared/cc-portrait-input/cc-portrait-input.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../../../core/auth/auth.service';

const AWARD_SENT_MS = 1600;

type DrawerTab = 'details' | 'secrets' | 'gold';

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-cc-player-secrets-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcSecretsWhisperRowComponent, CcPortraitInputComponent],
  templateUrl: './cc-player-secrets-content.component.html',
  styleUrl: './cc-player-secrets-content.component.scss'
})
export class CcPlayerSecretsContentComponent implements OnInit, OnChanges, OnDestroy {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);
  private hub = inject(CampaignHubService);
  private auth = inject(AuthService);

  private secretsChangedSub?: Subscription;
  private traitsSub?: Subscription;
  private playerSecretCreatedSub?: Subscription;
  private playerCardUpdatedSub?: Subscription;

  @Input() portalColor: string = '#6e28d0';
  @Input() mode: 'player' | 'dm' = 'player';
  @Input() member: PlayerCardWithDetails | null = null;
  @Input() campaignId: string = '';
  @Input() initialTab: DrawerTab = 'details';

  loading = signal(false);
  secrets = signal<PlayerCardSecret[]>([]);
  traits = signal<PlayerTrait[]>([]);

  memberCard = signal<PlayerCardWithDetails | null>(null);
  activeTab = signal<DrawerTab>('details');

  /**
   * Whether the viewer may write a secret onto the card on show: the DM delivers to anyone, a
   * player writes only their own card. This drawer opens from the party panel, which hands a
   * player every card but their own (see CcPartyPanelComponent), so for a player the answer is no
   * here — the panel is where they read what another player has shared.
   */
  get canAddSecrets(): boolean {
    if (this.mode === 'dm') return true;

    const card = this.memberCard();
    return !!card && card.playerUserId === this.auth.currentUser()?.id;
  }

  goldAmount = signal(0);
  goldCurrency = signal<Currency>('gp');
  goldNote = signal('');
  goldSaving = signal(false);
  goldSent = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
  goldAmountInput = viewChild.required<ElementRef<HTMLInputElement>>('goldAmountInput');

  private goldSentTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.activeTab.set(this.initialTab);
    if (this.initialTab === 'secrets') {
      this.loadSecrets();
    } else if (this.initialTab === 'gold') {
      this.resetGoldState();
    }

    this.memberCard.set(this.member);
    this.traits.set(this.member?.traits ?? []);

    this.secretsChangedSub = this.shellSvc.secretsChanged.subscribe(() => {
      if (this.activeTab() === 'secrets') {
        this.loadSecrets();
      }
    });

    this.traitsSub = this.hub.on('PlayerCardTraitsChanged', 'cc-player-secrets-content', event => {
      if (!event || event.campaignId !== this.campaignId) return;
      if (!this.member || event.playerCardId !== this.member.id) return;
      this.traits.set(event.traits);
    });

    this.playerSecretCreatedSub = this.hub.on('PlayerSecretCreated', 'cc-player-secrets-content', event => {
      if (!event || event.campaignId !== this.campaignId) return;
      if (!this.member || event.playerCardId !== this.member.id) return;
      if (this.activeTab() !== 'secrets') return;
      this.loadSecrets();
    });

    this.playerCardUpdatedSub = this.hub.on('PlayerCardUpdated', 'cc-player-secrets-content', event => {
      if (!event || event.campaignId !== this.campaignId) return;

      const card = this.memberCard();
      if (!card || event.playerCardId !== card.id) return;

      this.memberCard.set({
        ...card,
        name: event.name,
        race: event.race,
        class: event.class,
        description: event.description ?? undefined,
        imageUrl: event.imageUrl ?? undefined,
      });
    });
  }

  ngOnDestroy() {
    this.secretsChangedSub?.unsubscribe();
    this.traitsSub?.unsubscribe();
    this.playerSecretCreatedSub?.unsubscribe();
    this.playerCardUpdatedSub?.unsubscribe();
    if (this.goldSentTimer) clearTimeout(this.goldSentTimer);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['member']) {
      this.memberCard.set(this.member);
      this.traits.set(this.member?.traits ?? []);
    }

    const memberChanged = changes['member'];
    if ((memberChanged && !memberChanged.isFirstChange()) || (changes['campaignId'] && !changes['campaignId'].isFirstChange())) {
      this.setTab(this.activeTab());
    }
  }

  loadSecrets() {
    if (!this.member || !this.campaignId) return;
    this.loading.set(true);
    this.secrets.set([]);
    const suffix = this.mode === 'dm' ? '' : '/shared';
    this.http.get<PlayerCardSecret[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/${this.member.id}/secrets${suffix}`
    ).subscribe({
      next: s => { this.secrets.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetGoldState() {
    this.goldAmount.set(0);
    this.goldCurrency.set('gp');
    this.goldNote.set('');
    this.currencyDropdownOpen.set(false);
    setTimeout(() => {
      if (this.goldAmountInput()) {
        this.goldAmountInput().nativeElement.focus();
      }
    });
  }

  onSecretsChange(list: PlayerCardSecret[]): void {
    this.secrets.set(list);
  }

  setTab(tab: DrawerTab) {
    this.activeTab.set(tab);
    if (tab === 'secrets') {
      this.loadSecrets();
    } else if (tab === 'gold') {
      this.resetGoldState();
    }
  }

  onGoldAmountChange(value: string): void {
    const stripped = value.replace(/[^0-9]/g, '');
    const num = parseInt(stripped, 10);
    this.goldAmount.set(isNaN(num) ? 0 : num);
  }

  awardGold() {
    const amount = this.goldAmount();
    if (!amount || amount <= 0) return;
    this.goldSaving.set(true);
    const id = this.campaignId;
    const member = this.member;
    if (!member) return;

    const body = {
      amount,
      currency: this.goldCurrency(),
      note: this.goldNote() || null,
      playerCardId: member.id,
    };

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${id}/gold-award`, body)
      .subscribe({
        next: () => {
          this.goldSaving.set(false);
          this.flashAwardSent();
          this.shellSvc.goldAwardNotice.next({
            currency: body.currency,
            note: body.note,
            recipients: [{ name: member.name, amount }],
          });
        },
        error: () => this.goldSaving.set(false),
      });
  }

  private flashAwardSent(): void {
    this.goldSent.set(true);
    if (this.goldSentTimer) clearTimeout(this.goldSentTimer);
    this.goldSentTimer = setTimeout(() => this.goldSent.set(false), AWARD_SENT_MS);
  }

  visibleTraits(): PlayerTrait[] {
    const traits = this.traits();
    const filtered = this.mode === 'dm' ? traits : traits.filter(t => t.isShared);
    const order: PlayerTrait['traitType'][] = ['GOAL', 'FLAW', 'FEAR'];
    return [...filtered].sort((a, b) => order.indexOf(a.traitType) - order.indexOf(b.traitType));
  }

  traitLabel(type: PlayerTrait['traitType']): string {
    return type === 'GOAL' ? 'Goal' : type === 'FEAR' ? 'Fear' : 'Flaw';
  }
}
