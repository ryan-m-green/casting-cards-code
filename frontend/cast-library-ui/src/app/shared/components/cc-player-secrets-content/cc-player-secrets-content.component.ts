import { Component, inject, signal, Input, viewChild, ElementRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PlayerCardSecret, PlayerCardWithDetails } from '../../models/player-card.model';
import { CcSecretsManagerComponent } from '../v2';

type DrawerTab = 'details' | 'secrets' | 'gold';

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-cc-player-secrets-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcSecretsManagerComponent],
  templateUrl: './cc-player-secrets-content.component.html',
  styleUrl: './cc-player-secrets-content.component.scss'
})
export class CcPlayerSecretsContentComponent implements OnInit, OnChanges {
  private http = inject(HttpClient);

  @Input() portalColor: string = '#6e28d0';
  @Input() mode: 'player' | 'dm' = 'player';
  @Input() member: PlayerCardWithDetails | null = null;
  @Input() campaignId: string = '';
  @Input() initialTab: DrawerTab = 'details';

  loading = signal(false);
  secrets = signal<PlayerCardSecret[]>([]);
  activeTab = signal<DrawerTab>('details');

  // Gold tab state
  goldAmount = signal(0);
  goldCurrency = signal<Currency>('gp');
  goldNote = signal('');
  goldSaving = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
  goldAmountInput = viewChild.required<ElementRef<HTMLInputElement>>('goldAmountInput');

  ngOnInit() {
    this.activeTab.set(this.initialTab);
    if (this.initialTab === 'secrets') {
      this.loadSecrets();
    } else if (this.initialTab === 'gold') {
      this.resetGoldState();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const memberChanged = changes['member'];
    if ((memberChanged && !memberChanged.isFirstChange()) || (changes['campaignId'] && !changes['campaignId'].isFirstChange())) {
      this.setTab(this.activeTab());
    }
  }

  loadSecrets() {
    if (!this.member || !this.campaignId) return;
    this.loading.set(true);
    this.secrets.set([]);
    // DMs see every delivered secret; players only see the ones shared with the party.
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

  setTab(tab: DrawerTab) {
    this.activeTab.set(tab);
    if (tab === 'secrets') {
      this.loadSecrets();
    } else if (tab === 'gold') {
      this.resetGoldState();
    }
  }

  // ── Gold tab methods ─────────────────────────────────────────────────────────────
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
        },
        error: () => this.goldSaving.set(false),
      });
  }

  // ── Details tab ──────────────────────────────────────────────────────────────
  initial(name: string | undefined): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  raceClass(member: PlayerCardWithDetails): string {
    return [member.race, member.class].filter(Boolean).join(' · ');
  }
}
