import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import {
  PlayerCardWithDetails,
  PlayerCardCondition,
  PlayerCardSecret,
  PlayerTrait,
} from '../../../shared/models/player-card.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { CurrencyDisplayComponent, CurrencyLine } from '../../../shared/components/currency-display/currency-display.component';

const D5E_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-dm-the-party',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CardFlipComponent, CurrencyDisplayComponent],
  templateUrl: './dm-the-party.component.html',
  styleUrl: './dm-the-party.component.scss',
})
export class DmThePartyComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private shellSvc   = inject(CampaignShellService);
  auth               = inject(AuthService);

  campaignId   = signal('');
  campaign     = signal<CampaignDetail | null>(null);
  playerCards  = signal<PlayerCardWithDetails[]>([]);

  spineColor = computed(() => this.campaign()?.spineColor ?? '#6e28d0');

  // ── Award Gold modal ──────────────────────────────────────────────────────────
  goldModalTarget      = signal<PlayerCardWithDetails | null>(null);
  goldModalOpen        = signal(false);
  goldAmount           = signal(0);
  goldCurrency         = signal<Currency>('gp');
  goldNote             = signal('');
  goldSaving           = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // ── Condition modal ───────────────────────────────────────────────────────────
  condModalCard = signal<PlayerCardWithDetails | null>(null);
  condModalOpen = signal(false);
  condInput     = signal('');
  condStandard  = D5E_CONDITIONS;

  // ── Deliver Secret modal ──────────────────────────────────────────────────────
  secretModalCard  = signal<PlayerCardWithDetails | null>(null);
  secretModalOpen  = signal(false);
  secretContent    = signal('');
  secretSaving     = signal(false);

  // ── View Secrets modal ────────────────────────────────────────────────────────
  viewSecretsCard    = signal<PlayerCardWithDetails | null>(null);
  viewSecretsOpen    = signal(false);
  viewSecretsList    = signal<PlayerCardSecret[]>([]);
  viewSecretsLoading = signal(false);

  viewingCard = signal<PlayerCardWithDetails | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.shellSvc.setTitle('The Party');
    this.shellSvc.setCrumbs([
      { label: '← Locations', action: () => this.goBack() },
    ]);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => this.campaign.set(c));
    this.loadCards(id);
  }

  private loadCards(id: string) {
    this.http.get<PlayerCardWithDetails[]>(`${environment.apiUrl}/api/campaigns/${id}/player-cards`)
      .subscribe(cards => this.playerCards.set(cards));
  }

  goBack() {
    this.transition.quickCover();
    this.router.navigate(['/campaign', this.campaignId()]).then(() => this.transition.hide());
  }

  // ── Gold ──────────────────────────────────────────────────────────────────────
  openGoldModal(card: PlayerCardWithDetails | null) {
    this.goldModalTarget.set(card);
    this.goldAmount.set(0);
    this.goldCurrency.set('gp');
    this.goldNote.set('');
    this.currencyDropdownOpen.set(false);
    this.goldModalOpen.set(true);
  }

  awardGold() {
    const amount = this.goldAmount();
    if (!amount || amount <= 0) return;
    this.goldSaving.set(true);
    const id     = this.campaignId();
    const target = this.goldModalTarget();

    const body = {
      amount,
      currency:     this.goldCurrency(),
      note:         this.goldNote() || null,
      playerCardId: target?.id ?? null,
    };

    const currency = this.goldCurrency();

    this.http.post<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>(
      `${environment.apiUrl}/api/campaigns/${id}/gold-award`, body)
      .subscribe({
        next: (response) => {
          if (target) {
            // Single-player award — add full amount to that card only
            this.playerCards.update(list => list.map(c => {
              if (c.id !== target.id) return c;
              const existing = c.currencyBalances.find(b => b.currency === currency);
              const updated = existing
                ? c.currencyBalances.map(b => b.currency === currency ? { ...b, amount: b.amount + amount } : b)
                : [...c.currencyBalances, { currency, amount }];
              return { ...c, currencyBalances: updated };
            }));
          } else {
            // Party award — apply exact per-player splits from the backend response
            const splits = response.playerAwards;
            this.playerCards.update(list => list.map(c => {
              const split = splits.find(s => s.playerUserId === c.playerUserId);
              if (!split || split.amount === 0) return c;
              const existing = c.currencyBalances.find(b => b.currency === currency);
              const updated = existing
                ? c.currencyBalances.map(b => b.currency === currency ? { ...b, amount: b.amount + split.amount } : b)
                : [...c.currencyBalances, { currency, amount: split.amount }];
              return { ...c, currencyBalances: updated };
            }));
          }
          this.goldSaving.set(false);
          this.goldModalOpen.set(false);
        },
        error: () => this.goldSaving.set(false),
      });
  }

  // ── Conditions ────────────────────────────────────────────────────────────────
  openCondModal(card: PlayerCardWithDetails) {
    this.condModalCard.set(card);
    this.condInput.set('');
    this.condModalOpen.set(true);
  }

  assignCondition(conditionName: string) {
    const card = this.condModalCard();
    if (!card) return;
    const id = this.campaignId();
    this.http.post<PlayerCardCondition>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${card.id}/conditions`,
      { conditionName }
    ).subscribe(cond => {
      this.playerCards.update(list =>
        list.map(c => c.id === card.id ? { ...c, conditions: [...c.conditions, cond] } : c)
      );
      this.condModalCard.update(c => c ? { ...c, conditions: [...c.conditions, cond] } : c);
    });
  }

  removeCondition(card: PlayerCardWithDetails, conditionId: string) {
    const id = this.campaignId();
    this.http.delete(`${environment.apiUrl}/api/campaigns/${id}/player-cards/${card.id}/conditions/${conditionId}`)
      .subscribe(() => {
        this.playerCards.update(list =>
          list.map(c => c.id === card.id
            ? { ...c, conditions: c.conditions.filter(x => x.id !== conditionId) }
            : c
          )
        );
        this.condModalCard.update(c => c
          ? { ...c, conditions: c.conditions.filter(x => x.id !== conditionId) }
          : c
        );
      });
  }

  conditionsForModal(): PlayerCardCondition[] {
    return this.condModalCard()?.conditions ?? [];
  }

  isConditionActive(card: PlayerCardWithDetails, name: string): boolean {
    return card.conditions.some(c => c.conditionName === name);
  }

  // ── Secrets ───────────────────────────────────────────────────────────────────
  openSecretModal(card: PlayerCardWithDetails) {
    this.secretModalCard.set(card);
    this.secretContent.set('');
    this.secretModalOpen.set(true);
  }

  deliverSecret() {
    const card = this.secretModalCard();
    if (!card || !this.secretContent().trim()) return;
    this.secretSaving.set(true);
    const id = this.campaignId();
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${card.id}/secrets`,
      { content: this.secretContent().trim() }
    ).subscribe({
      next: () => {
        this.secretSaving.set(false);
        this.secretModalOpen.set(false);
      },
      error: () => this.secretSaving.set(false),
    });
  }

  // ── View Secrets ──────────────────────────────────────────────────────────────
  openViewSecretsModal(card: PlayerCardWithDetails) {
    this.viewSecretsCard.set(card);
    this.viewSecretsList.set([]);
    this.viewSecretsLoading.set(true);
    this.viewSecretsOpen.set(true);
    const id = this.campaignId();
    this.http.get<PlayerCardSecret[]>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${card.id}/secrets`
    ).subscribe({
      next: secrets => {
        this.viewSecretsList.set(secrets);
        this.viewSecretsLoading.set(false);
      },
      error: () => this.viewSecretsLoading.set(false),
    });
  }

  deletePlayerSecret(secretId: string) {
    const card = this.viewSecretsCard();
    if (!card) return;
    const id = this.campaignId();
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${card.id}/secrets/${secretId}`
    ).subscribe(() => {
      this.viewSecretsList.update(list => list.filter(s => s.id !== secretId));
    });
  }

  cardPurse(card: PlayerCardWithDetails): CurrencyLine[] {
    return card.currencyBalances.map(b => ({ type: b.currency, amount: b.amount }));
  }

  goalsFor(card: PlayerCardWithDetails) { return (card.traits ?? []).filter(t => t.traitType === 'GOAL'); }
  fearsFor(card: PlayerCardWithDetails) { return (card.traits ?? []).filter(t => t.traitType === 'FEAR'); }
  flawsFor(card: PlayerCardWithDetails) { return (card.traits ?? []).filter(t => t.traitType === 'FLAW'); }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
