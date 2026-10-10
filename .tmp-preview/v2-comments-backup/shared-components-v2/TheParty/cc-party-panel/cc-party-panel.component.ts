import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ElementRef, ViewChild, afterNextRender, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { PlayerCardWithDetails } from '../../../../models/player-card.model';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CcPlayerCardComponent } from '../../carddeck/cc-player-card/cc-player-card.component';
import { CcSimplePlayerCardComponent } from '../../carddeck/cc-simple-player-card/cc-simple-player-card.component';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCardFadeDirective, cardFadeWindowMs } from '../../../../directives/cc-card-fade.directive';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { AuthService } from '../../../../../core/auth/auth.service';

/**
 * How long after a swap both rows are re-made from a plain timer, in ms. The same beat the rolodex
 * rows take before they re-initialize their Swiper (see cc-card-navigation).
 */
const ROW_REMEASURE_MS = 50;

@Component({
  selector: 'app-cc-party-panel',
  standalone: true,
  imports: [CommonModule, CcPlayerCardComponent, CcSimplePlayerCardComponent, CcCastCardComponent, CcSimpleCastCardComponent, CcCardFadeDirective],
  /**
   * OnPush: the panel's companions and party cards are signals, so the panel is redrawn when they
   * move — a card written into the party by a travel, say (see the shell's `writeCampaign`) — and
   * not on every check the page takes.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-party-panel.component.html',
  styleUrl: './cc-party-panel.component.scss',
})
export class CcPartyPanelComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private shellSvc = inject(V2CampaignShellService);
  private gridLoad = inject(V2GridLoadService);
  private injector = inject(Injector);
  private auth = inject(AuthService);

  /** Whether the viewer is a GM/Admin: the role the cast cards' own controls are handed to. */
  readonly isDm = this.auth.isDm;

  /**
   * What the top-right area is known by — the heading over it, and the mark it wears on the radial
   * navigator — published for as long as this panel stands in the area (see V2GridAreaMarkService).
   */
  private readonly mark = publishGridAreaMark('top-right', 'content', {
    title: () => ['The Party'],
    icon: { path: '/player_icon.svg', width: 32, height: 32 },
  });

  @ViewChild('cardGrid', { static: false }) cardGridRef!: ElementRef<HTMLElement>;
  @ViewChild('companionsGrid', { static: false }) companionsGridRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;
  private companionsSwiper: Swiper | null = null;

  /** Campaign ID used to load the player cards and questing companions. */
  campaignId = input.required<string>();

  /** Portal/campaign accent color used for the party treasure button border. */
  portalColor = input<string>('#6e28d0');

  playerCards = signal<PlayerCardWithDetails[]>([]);

  /** When true, the companions row shows full cast cards and the player row collapses to simple cards. */
  companionsExpanded = signal(false);

  /**
   * Whether the panel is taking its cards away before it swaps them for the other size. Raised by
   * `beginTransition` and bound to every card as `ccCardFadeOut`, so each card fades where it
   * stands (see CcCardFadeDirective).
   */
  transitioning = signal(false);

  /** The swap waiting on the cards to fade away, so that leaving can call it off. */
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  /** The re-measure waiting on a beat after a swap, so that leaving can call it off. */
  private remeasureTimer: ReturnType<typeof setTimeout> | null = null;

  private partyGoldAwardedSubscription?: Subscription;

  questingCompanions = computed<CampaignCastInstance[]>(() => {
    const c = this.shellSvc.campaign();
    if (!c) return [];
    const partySubloc = c.sublocations.find(s => s.isPartyAnchor);
    if (!partySubloc) return [];
    return c.casts.filter(ca => ca.sublocationInstanceId === partySubloc.instanceId);
  });

  partySublocationInstanceId = computed(() => {
    const c = this.shellSvc.campaign();
    if (!c) return null;
    return c.sublocations.find(s => s.isPartyAnchor)?.instanceId ?? null;
  });

  /** Whether the panel has been through a swap yet (see the swap effect in the constructor). */
  private swapSeen = false;

  private playerCardTiltMap = new Map<string, number>();
  private companionTiltMap = new Map<string, number>();

  constructor() {
    effect(() => {
      const count = this.playerCards().length;
      if (count === 0) {
        if (this.swiper) {
          this.swiper.destroy(true, true);
          this.swiper = null;
        }
        return;
      }
      if (this.swiper && this.swiper.slides.length === count) {
        this.swiper.update();
        return;
      }
      afterNextRender(() => this.initSwiper(), { injector: this.injector });
    });

    effect(() => {
      const count = this.questingCompanions().length;
      if (count === 0) {
        if (this.companionsSwiper) {
          this.companionsSwiper.destroy(true, true);
          this.companionsSwiper = null;
        }
        return;
      }
      if (this.companionsSwiper && this.companionsSwiper.slides.length === count) {
        this.companionsSwiper.update();
        return;
      }
      afterNextRender(() => this.initCompanionsSwiper(), { injector: this.injector });
    });

    // The swap changes what the two rows hold: the cards, and the slides under them, are a different
    // size on the other side of it. A row that keeps the numbers it took before the swap believes
    // nothing overflows — and a row that believes that cannot be turned at all, because its whole
    // travel is a single point (Swiper's `watchOverflow`: `isLocked`, a snapGrid of one). So both rows
    // are made afresh as soon as the new size is in the DOM: the effect is what says the swap has
    // happened, and `afterNextRender` is what puts the re-measure after the render that applied it.
    effect(() => {
      this.companionsExpanded();

      // The panel's own first run: nothing has been swapped yet, and the two effects above hold
      // whatever Swipers the cards need.
      if (!this.swapSeen) {
        this.swapSeen = true;
        return;
      }

      afterNextRender(() => this.remeasureRows(), { injector: this.injector });
    });
  }

  playerCardTiltFor(id: string): number {
    if (!this.playerCardTiltMap.has(id)) {
      this.playerCardTiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.playerCardTiltMap.get(id)!;
  }

  companionTiltFor(instanceId: string): number {
    if (!this.companionTiltMap.has(instanceId)) {
      this.companionTiltMap.set(instanceId, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.companionTiltMap.get(instanceId)!;
  }

  ngOnInit() {
    this.http
      .get<PlayerCardWithDetails[]>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards`
      )
      .subscribe({
        next: cards => {
          this.playerCards.set(cards);
          this.gridLoad.report('top-right', 'content');
        },
        // A party that would not load is still a party panel that is done loading.
        error: () => this.gridLoad.report('top-right', 'content'),
      });

    this.partyGoldAwardedSubscription = this.shellSvc.partyGoldAwarded.subscribe(response => {
      this.onPartyGoldAwarded(response);
    });
  }

  ngOnDestroy() {
    // A swap still waiting on the cards to fade away goes with the panel
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // So does the re-measure waiting on a beat after a swap
    if (this.remeasureTimer !== null) {
      clearTimeout(this.remeasureTimer);
      this.remeasureTimer = null;
    }

    this.partyGoldAwardedSubscription?.unsubscribe();
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    if (this.companionsSwiper) {
      this.companionsSwiper.destroy(true, true);
      this.companionsSwiper = null;
    }
  }

  private initSwiper() {
    if (!this.cardGridRef?.nativeElement) return;
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    this.swiper = new Swiper(this.cardGridRef.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 14,
      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 1,
        momentumBounceRatio: 1,
        sticky: false,
      },
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: false,
      },
      grabCursor: true,
      resistance: true,
      resistanceRatio: 0.85,
      speed: 300,
      observer: true,
      watchOverflow: true,
      watchSlidesProgress: true,
    });
  }

  private initCompanionsSwiper() {
    if (!this.companionsGridRef?.nativeElement) return;
    if (this.companionsSwiper) {
      this.companionsSwiper.destroy(true, true);
      this.companionsSwiper = null;
    }
    this.companionsSwiper = new Swiper(this.companionsGridRef.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 14,
      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 1,
        momentumBounceRatio: 1,
        sticky: false,
      },
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: false,
      },
      grabCursor: true,
      resistance: true,
      resistanceRatio: 0.85,
      speed: 300,
      observer: true,
      watchOverflow: true,
      watchSlidesProgress: true,
    });
  }

  onCardActions(card: PlayerCardWithDetails) {
    this.shellSvc.openPlayerSecretsDrawer(card, this.campaignId(), this.portalColor() ?? '#6e28d0');
  }

  openPartyGoldDrawer() {
    this.shellSvc.openPartyGoldDrawer();
  }

  onPartyGoldAwarded(response: { currency: string; playerAwards: { playerUserId: string; amount: number }[] }) {
    const splits = response.playerAwards;
    const currency = response.currency;
    this.playerCards.update(list => list.map(c => {
      const split = splits.find(s => s.playerUserId === c.playerUserId);
      if (!split || split.amount === 0) return c;
      const balances = c.currencyBalances ?? [];
      const existing = balances.find(b => b.currency === currency);
      const updated = existing
        ? balances.map(b => b.currency === currency ? { ...b, amount: b.amount + split.amount } : b)
        : [...balances, { currency, amount: split.amount }];
      return { ...c, currencyBalances: updated };
    }));
  }

  /**
   * Clicking a simple companion card asks for the other size: the whole panel swaps, so the
   * cards are taken away first and the companions' full cards come in their place (see
   * `beginTransition`).
   */
  onCompanionCardClick() {
    if (this.companionsExpanded()) return;
    this.beginTransition(() => this.companionsExpanded.set(true));
  }

  /**
   * Clicking a simple player card asks to go back the way it came: the panel's cards fade away
   * and the party's own full cards come back in (see `beginTransition`).
   */
  onPlayerCardClick() {
    if (!this.companionsExpanded()) return;
    this.beginTransition(() => this.companionsExpanded.set(false));
  }

  goToCompanion(cast: CampaignCastInstance) {
    const sublocationId = this.partySublocationInstanceId();
    if (!sublocationId) return;
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', sublocationId, 'cast', cast.instanceId]);
  }

  /**
   * Takes the panel's cards away, then swaps them: every card fades where it stands, and only once
   * they have gone (or nearly, at `cardFadeWindowMs`) does `swap` put the new ones in, so the cards
   * arriving are laid out in rows the old ones have already left, and the Swipers re-measured just
   * after count only the new cards.
   *
   * `swap` is the state change the panel would have made on the spot. A second click while the cards
   * are fading away is not a second move, and a viewer who has asked for less movement has no fades
   * to wait for: they are swapped straight away.
   */
  private beginTransition(swap: () => void) {
    if (this.transitioning()) return;

    const fadeWindow = cardFadeWindowMs();
    if (fadeWindow === 0) {
      this.swapped(swap);
      return;
    }

    this.transitioning.set(true);
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      this.transitioning.set(false);
      this.swapped(swap);
    }, fadeWindow);
  }

  /**
   * The other size going in, and the two rows re-made with it: the cards are a different size on
   * this side of the swap, so each row measures its own slides afresh rather than keeping the
   * numbers it took before the swap — a row left holding those numbers is a row that cannot be
   * turned (see the constructor's swap effect).
   */
  private swapped(swap: () => void) {
    swap();

    // Once tied to the render that applied the new size, and once a beat later from a plain timer,
    // the way the rolodex rows do it (see cc-card-navigation). Whichever of the two lands last is
    // the measure the row keeps, and both are taken with the cards the row is actually holding.
    afterNextRender(() => this.remeasureRows(), { injector: this.injector });
    this.remeasureTimer = setTimeout(() => {
      this.remeasureTimer = null;
      this.remeasureRows();
    }, ROW_REMEASURE_MS);
  }

  /** Both rows made afresh, so each measures the cards it is holding now. */
  private remeasureRows(): void {
    this.initSwiper();
    this.initCompanionsSwiper();
  }
}
