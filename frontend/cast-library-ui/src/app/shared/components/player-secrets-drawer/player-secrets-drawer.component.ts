import { Component, inject, signal, computed, HostListener, OnInit, Input, viewChild, ElementRef } from '@angular/core';
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
  selector: 'app-player-secrets-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-secrets-drawer.component.html',
  styleUrl: './player-secrets-drawer.component.scss'
})
export class PlayerSecretsDrawerComponent {
  private http = inject(HttpClient);

  @Input() portalColor: string = '#6e28d0';
  @Input() mode: 'player' | 'dm' = 'player';

  isOpen = signal(false);
  isClosing = signal(false);
  loading = signal(false);
  member = signal<PlayerCardWithDetails | null>(null);
  secrets = signal<PlayerCardSecret[]>([]);
  campaignId = signal('');
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

  open(member: PlayerCardWithDetails, campaignId: string, tab: DrawerTab = 'secrets') {
    this.member.set(member);
    this.campaignId.set(campaignId);
    this.activeTab.set(tab);
    this.isOpen.set(true);

    if (tab === 'secrets') {
      this.loading.set(true);
      this.secrets.set([]);
      this.http.get<PlayerCardSecret[]>(
        `${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${member.id}/secrets/shared`
      ).subscribe({
        next: s => { this.secrets.set(s); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else if (tab === 'gold') {
      this.goldAmount.set(0);
      this.goldCurrency.set('gp');
      this.goldNote.set('');
      this.currencyDropdownOpen.set(false);
      setTimeout(() => {
        this.goldAmountInput().nativeElement.focus();
      });
    } else if (tab === 'conditions') {
      this.condInput.set('');
    } else if (tab === 'deliver') {
      this.secretContent.set('');
    }
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.member.set(null);
      this.secrets.set([]);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  setTab(tab: DrawerTab) {
    this.activeTab.set(tab);
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
    const id = this.campaignId();
    const member = this.member();
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
          this.close();
        },
        error: () => this.goldSaving.set(false),
      });
  }

  // ── Conditions tab methods ───────────────────────────────────────────────────────
  conditionsForCard(): PlayerCardCondition[] {
    return this.member()?.conditions ?? [];
  }

  isConditionActive(name: string): boolean {
    return this.member()?.conditions.some(c => c.conditionName === name) ?? false;
  }

  assignCondition(conditionName: string) {
    const member = this.member();
    if (!member) return;
    const id = this.campaignId();
    this.http.post<PlayerCardCondition>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/conditions`,
      { conditionName }
    ).subscribe(cond => {
      this.member.update(m => m ? { ...m, conditions: [...m.conditions, cond] } : m);
    });
  }

  removeCondition(conditionId: string) {
    const member = this.member();
    if (!member) return;
    const id = this.campaignId();
    this.http.delete(`${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/conditions/${conditionId}`)
      .subscribe(() => {
        this.member.update(m => m
          ? { ...m, conditions: m.conditions.filter(c => c.id !== conditionId) }
          : m
        );
      });
  }

  // ── Deliver secret tab methods ───────────────────────────────────────────────────
  deliverSecret() {
    const member = this.member();
    if (!member || !this.secretContent().trim()) return;
    this.secretSaving.set(true);
    const id = this.campaignId();
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/secrets`,
      { content: this.secretContent().trim() }
    ).subscribe({
      next: () => {
        this.secretSaving.set(false);
        this.close();
      },
      error: () => this.secretSaving.set(false),
    });
  }

  // ── Secrets tab methods ─────────────────────────────────────────────────────────
  deleteSecret(secretId: string) {
    const member = this.member();
    if (!member) return;
    const id = this.campaignId();
    this.http.delete(`${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/secrets/${secretId}`)
      .subscribe(() => {
        this.secrets.update(s => s.filter(sec => sec.id !== secretId));
      });
  }
}
