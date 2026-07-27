import { Component, inject, signal, Input, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PlayerCardSecret, PlayerCardWithDetails, PlayerCardCondition } from '../../models/player-card.model';

type DrawerTab = 'secrets' | 'gold' | 'conditions' | 'deliver';

const D5E_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-player-secrets-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-secrets-content.component.html',
  styleUrl: './player-secrets-content.component.scss'
})
export class PlayerSecretsContentComponent {
  private http = inject(HttpClient);

  @Input() portalColor: string = '#6e28d0';
  @Input() mode: 'player' | 'dm' = 'player';
  @Input() member: PlayerCardWithDetails | null = null;
  @Input() campaignId: string = '';
  @Input() initialTab: DrawerTab = 'secrets';

  loading = signal(false);
  secrets = signal<PlayerCardSecret[]>([]);
  activeTab = signal<DrawerTab>('secrets');

  // Gold tab state
  goldAmount = signal(0);
  goldCurrency = signal<Currency>('gp');
  goldNote = signal('');
  goldSaving = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
  goldAmountInput = viewChild.required<ElementRef<HTMLInputElement>>('goldAmountInput');

  // Conditions tab state
  condInput = signal('');
  condStandard = D5E_CONDITIONS;

  // Deliver secret tab state
  secretContent = signal('');
  secretSaving = signal(false);

  ngOnInit() {
    this.activeTab.set(this.initialTab);
    if (this.initialTab === 'secrets') {
      this.loadSecrets();
    } else if (this.initialTab === 'gold') {
      this.resetGoldState();
    } else if (this.initialTab === 'conditions') {
      this.condInput.set('');
    } else if (this.initialTab === 'deliver') {
      this.secretContent.set('');
    }
  }

  loadSecrets() {
    if (!this.member || !this.campaignId) return;
    this.loading.set(true);
    this.secrets.set([]);
    this.http.get<PlayerCardSecret[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/${this.member.id}/secrets/shared`
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
    } else if (tab === 'conditions') {
      this.condInput.set('');
    } else if (tab === 'deliver') {
      this.secretContent.set('');
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

  // ── Conditions tab methods ───────────────────────────────────────────────────────
  conditionsForCard(): PlayerCardCondition[] {
    return this.member?.conditions ?? [];
  }

  isConditionActive(name: string): boolean {
    return this.member?.conditions.some(c => c.conditionName === name) ?? false;
  }

  assignCondition(conditionName: string) {
    const member = this.member;
    if (!member) return;
    const id = this.campaignId;
    this.http.post<PlayerCardCondition>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/conditions`,
      { conditionName }
    ).subscribe(cond => {
      // Note: This would need to emit an event or callback to update parent state
      // For now, we'll update the local member reference if possible
      if (this.member) {
        this.member = { ...this.member, conditions: [...this.member.conditions, cond] };
      }
    });
  }

  removeCondition(conditionId: string) {
    const member = this.member;
    if (!member) return;
    const id = this.campaignId;
    this.http.delete(`${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/conditions/${conditionId}`)
      .subscribe(() => {
        if (this.member) {
          this.member = {
            ...this.member,
            conditions: this.member.conditions.filter(c => c.id !== conditionId)
          };
        }
      });
  }

  // ── Deliver secret tab methods ───────────────────────────────────────────────────
  deliverSecret() {
    const member = this.member;
    if (!member || !this.secretContent().trim()) return;
    this.secretSaving.set(true);
    const id = this.campaignId;
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/secrets`,
      { content: this.secretContent().trim() }
    ).subscribe({
      next: () => {
        this.secretSaving.set(false);
      },
      error: () => this.secretSaving.set(false),
    });
  }

  // ── Secrets tab methods ─────────────────────────────────────────────────────────
  deleteSecret(secretId: string) {
    const member = this.member;
    if (!member) return;
    const id = this.campaignId;
    this.http.delete(`${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/secrets/${secretId}`)
      .subscribe(() => {
        this.secrets.update(s => s.filter(sec => sec.id !== secretId));
      });
  }
}
