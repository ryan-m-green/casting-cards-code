import { Component, OnInit, signal, computed, inject, viewChild, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import {
  PlayerCardWithDetails,
  PlayerCardCondition,
  PlayerCardSecret,
  PlayerTrait,
} from '../../../shared/models/player-card.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { CastingCardPlayerComponent } from '../../../shared/components/casting-card-player/casting-card-player.component';
import { CurrencyDisplayComponent, CurrencyLine } from '../../../shared/components/currency-display/currency-display.component';
import { PlayerSecretsDrawerComponent } from '../../../shared/components/player-secrets-drawer/player-secrets-drawer.component';

const D5E_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-dm-the-party',
  standalone: true,
  imports: [CommonModule, FormsModule, CastingCardPlayerComponent, CastCardComponent, PlayerSecretsDrawerComponent],
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

  questingCompanions = computed<CampaignCastInstance[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    const partySubloc = c.sublocations.find(s => s.isPartyAnchor);
    if (!partySubloc) return [];
    return c.casts.filter(ca => ca.sublocationInstanceId === partySubloc.instanceId);
  });

  partySublocationInstanceId = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(s => s.isPartyAnchor)?.instanceId ?? null;
  });

  // ── Travel drawer ──────────────────────────────────────────────────────────
  openTravelFor      = signal<string | null>(null);
  travelSelectedLoc  = signal<string | null>(null);

  partyAnchor = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(s => s.isPartyAnchor) ?? null;
  });

  travelLocations = computed(() => {
    const c = this.campaign();
    if (!c) return [];
    const partyLocationId = this.partyAnchor()?.locationInstanceId;
    return c.locations.filter((loc: CampaignLocationInstance) => loc.instanceId !== partyLocationId);
  });

  sublocationsByLocation = computed<Record<string, CampaignSublocationInstance[]>>(() => {
    const c = this.campaign();
    if (!c) return {};
    return c.sublocations
      .filter((s: CampaignSublocationInstance) => !s.isPartyAnchor)
      .reduce((acc: Record<string, CampaignSublocationInstance[]>, s: CampaignSublocationInstance) => {
        acc[s.locationInstanceId] = acc[s.locationInstanceId] ? [...acc[s.locationInstanceId], s] : [s];
        return acc;
      }, {});
  });

  toggleTravelFor(castInstanceId: string) {
    if (this.openTravelFor() === castInstanceId) {
      this.openTravelFor.set(null);
    } else {
      this.openTravelFor.set(castInstanceId);
      this.travelSelectedLoc.set(null);
    }
  }

  travelCast(cast: CampaignCastInstance, locationInstanceId: string, sublocationInstanceId: string) {
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${cast.instanceId}/travel`,
      { locationInstanceId, sublocationInstanceId, fromSublocationInstanceId: cast.sublocationInstanceId }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === cast.instanceId
            ? { ...ca, locationInstanceId, sublocationInstanceId }
            : ca
        )
      } : c);
      this.openTravelFor.set(null);
      this.travelSelectedLoc.set(null);
    });
  }

  private companionTiltMap = new Map<string, number>();
  private playerCardTiltMap = new Map<string, number>();

  companionTiltFor(instanceId: string): number {
    if (!this.companionTiltMap.has(instanceId)) {
      this.companionTiltMap.set(instanceId, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.companionTiltMap.get(instanceId)!;
  }

  playerCardTiltFor(id: string): number {
    if (!this.playerCardTiltMap.has(id)) {
      this.playerCardTiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.playerCardTiltMap.get(id)!;
  }

  // ── Award Gold modal ──────────────────────────────────────────────────────────
  goldModalTarget      = signal<PlayerCardWithDetails | null>(null);
  goldModalOpen        = signal(false);
  goldAmount           = signal(0);
  goldCurrency         = signal<Currency>('gp');
  goldNote             = signal('');
  goldSaving           = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
  goldAmountInput      = viewChild.required<ElementRef<HTMLInputElement>>('goldAmountInput');

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

  // ── View Secrets drawer ───────────────────────────────────────────────────────
  @ViewChild(PlayerSecretsDrawerComponent) secretsDrawer: PlayerSecretsDrawerComponent | null = null;

  viewingCard = signal<PlayerCardWithDetails | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.shellSvc.setTitleContext({ pageType: 'gm-party', campaignId: id, baseRoute: '/campaign', location: null }, '56px');
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

  goToCompanion(cast: CampaignCastInstance) {
    const sublocationId = this.partySublocationInstanceId();
    if (!sublocationId) return;
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', sublocationId, 'cast', cast.instanceId]);
  }

  // ── Gold ──────────────────────────────────────────────────────────────────────
  onGoldAmountChange(value: string): void {
    const stripped = value.replace(/[^0-9]/g, '');
    const num = parseInt(stripped, 10);
    this.goldAmount.set(isNaN(num) ? 0 : num);
  }

  openGoldModal(card: PlayerCardWithDetails | null) {
    this.goldModalTarget.set(card);
    this.goldAmount.set(0);
    this.goldCurrency.set('gp');
    this.goldNote.set('');
    this.currencyDropdownOpen.set(false);
    this.goldModalOpen.set(true);
    setTimeout(() => {
      this.goldAmountInput().nativeElement.focus();
    });
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
    this.secretsDrawer?.open(card, this.campaignId());
  }

  cardPurse(card: PlayerCardWithDetails): CurrencyLine[] {
    return card.currencyBalances.map(b => ({ type: b.currency, amount: b.amount }));
  }

  goalsFor(card: PlayerCardWithDetails) { return (card.traits ?? []).filter(t => t.traitType === 'GOAL'); }
  fearsFor(card: PlayerCardWithDetails) { return (card.traits ?? []).filter(t => t.traitType === 'FEAR'); }
  flawsFor(card: PlayerCardWithDetails) { return (card.traits ?? []).filter(t => t.traitType === 'FLAW'); }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
