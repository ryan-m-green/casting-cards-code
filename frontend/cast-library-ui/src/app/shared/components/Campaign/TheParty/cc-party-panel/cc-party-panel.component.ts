import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ElementRef, ViewChild, afterNextRender, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { PlayerCardWithDetails } from '../../../../models/player-card.model';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { moveCastTo } from '../../../../models/campaign-card-state';
import { CcPlayerCardComponent } from '../../carddeck/cc-player-card/cc-player-card.component';
import { CcSimplePlayerCardComponent } from '../../carddeck/cc-simple-player-card/cc-simple-player-card.component';
import { CcCastCardComponent } from '../../../Shared/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCardFadeDirective, cardFadeWindowMs } from '../../../../directives/cc-card-fade.directive';
import { CcCardSpotlightComponent } from '../../Shared/cc-card-spotlight/cc-card-spotlight.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../../core/drawer.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CardSpotlightService } from '../../../../../core/card-spotlight.service';
import { GridAreaChangeService } from '../../../../../core/grid-area-change.service';

const ROW_REMEASURE_MS = 50;

@Component({
  selector: 'app-cc-party-panel',
  standalone: true,
  imports: [CommonModule, CcPlayerCardComponent, CcSimplePlayerCardComponent, CcCastCardComponent, CcSimpleCastCardComponent, CcCardFadeDirective, CcCardSpotlightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-party-panel.component.html',
  styleUrl: './cc-party-panel.component.scss',
})
export class CcPartyPanelComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private drawer = inject(DrawerService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private injector = inject(Injector);
  private auth = inject(AuthService);
  private hub = inject(CampaignHubService);
  private spotlight = inject(CardSpotlightService);
  private areaChange = inject(GridAreaChangeService);

  readonly isDm = this.shellSvc.isDm;

  private readonly mark = publishGridAreaMark('top-right', 'content', {
    title: () => ['The Party'],
    icon: { path: '/player_icon.svg', width: 32, height: 32 },
  });

  @ViewChild('cardGrid', { static: false }) cardGridRef!: ElementRef<HTMLElement>;
  @ViewChild('companionsGrid', { static: false }) companionsGridRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;
  private companionsSwiper: Swiper | null = null;

  campaignId = input.required<string>();

  portalColor = input<string>('#6e28d0');

  playerCards = signal<PlayerCardWithDetails[]>([]);

  companionsExpanded = signal(false);

  transitioning = signal(false);

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  private remeasureTimer: ReturnType<typeof setTimeout> | null = null;

  private partyGoldAwardedSubscription?: Subscription;

  private hubSubscriptions: Subscription[] = [];

  questingCompanions = computed<CampaignCastInstance[]>(() => {
    const c = this.shellSvc.campaign();
    if (!c) return [];
    const partySubloc = c.sublocations.find(s => s.isPartyAnchor);
    if (!partySubloc) return [];
    return c.casts.filter(ca => ca.sublocationInstanceId === partySubloc.instanceId);
  });

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

    effect(() => {
      this.companionsExpanded();

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
          const myId = this.auth.currentUser()?.id;
          this.playerCards.set(
            !this.isDm() && myId
              ? cards.filter(c => c.playerUserId !== myId)
              : cards
          );
          this.gridLoad.report('top-right', 'content');
        },
        error: () => this.gridLoad.report('top-right', 'content'),
      });

    this.partyGoldAwardedSubscription = this.shellSvc.partyGoldAwarded.subscribe(response => {
      this.onPartyGoldAwarded(response);
    });

    this.hubSubscriptions.push(
      this.hub.on('SecretShared', 'cc-party-panel', event => {
        if (!event) return;
        if (!this.shellSvc.isPlayer()) return;
        const myCardId = this.playerCards().find(
          p => p.playerUserId === this.auth.currentUser()?.id
        )?.id;
        if (!myCardId || event.playerCardId === myCardId) return;
        if (!this.playerCards().some(p => p.id === event.playerCardId)) return;
        this.spotlight.reveal(event.playerCardId);
        this.areaChange.notify('top-right');
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('PlayerCardTraitsChanged', 'cc-party-panel', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.playerCards.update(list =>
          list.map(c => (c.id === event.playerCardId ? { ...c, traits: event.traits } : c))
        );
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('PlayerCardUpdated', 'cc-party-panel', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.playerCards.update(list =>
          list.map(c => (c.id === event.playerCardId
            ? {
                ...c,
                name: event.name,
                race: event.race,
                class: event.class,
                description: event.description ?? undefined,
                imageUrl: event.imageUrl ?? undefined,
              }
            : c))
        );
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('InventoryItemPurchased', 'cc-party-panel', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (!event.currencyBalances?.length) return;
        this.playerCards.update(list =>
          list.map(c => (c.playerUserId === event.playerUserId
            ? { ...c, currencyBalances: event.currencyBalances }
            : c))
        );
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CastTraveled', 'cc-party-panel', event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const sublocationInstanceId = event.isVisible
          ? event.toSublocationInstanceId
          : event.fromSublocationInstanceId;

        this.shellSvc.updateCampaign(c => {
          if (!c) return c;

          const casts = moveCastTo(c.casts, x => x.instanceId === event.castInstanceId,
            sublocationInstanceId, event.toLocationInstanceId);

          return casts === c.casts ? c : { ...c, casts };
        });

        if (!event.isVisible || !event.traveledToTheParty) return;
        if (!this.shellSvc.isPlayer()) return;

        this.spotlight.reveal(event.castInstanceId);
        this.areaChange.notify('top-right');
      })
    );

  }

  ngOnDestroy() {
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.remeasureTimer !== null) {
      clearTimeout(this.remeasureTimer);
      this.remeasureTimer = null;
    }

    this.partyGoldAwardedSubscription?.unsubscribe();
    this.hubSubscriptions.forEach(s => s.unsubscribe());
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

  onPartyGoldAwarded(response: { currency: string; note?: string | null; playerAwards: { playerUserId: string; amount: number }[] }) {
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

    const recipients = splits
      .filter(split => split.amount > 0)
      .map(split => ({
        name: this.playerCards().find(c => c.playerUserId === split.playerUserId)?.name ?? 'A player',
        amount: split.amount,
      }));

    if (recipients.length) {
      this.shellSvc.goldAwardNotice.next({ currency, note: response.note ?? null, recipients });
    }
  }

  onCompanionCardClick() {
    if (this.companionsExpanded()) return;
    this.beginTransition(() => this.companionsExpanded.set(true));
  }

  onPlayerCardClick() {
    if (!this.companionsExpanded()) return;
    this.beginTransition(() => this.companionsExpanded.set(false));
  }

  goToCompanion(cast: CampaignCastInstance) {
    this.drawer.openCastDetail({
      cast,
      secrets: [],
      campaignId: this.campaignId(),
      castInstanceId: cast.instanceId,
    });
  }

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

  private swapped(swap: () => void) {
    swap();

    afterNextRender(() => this.remeasureRows(), { injector: this.injector });
    this.remeasureTimer = setTimeout(() => {
      this.remeasureTimer = null;
      this.remeasureRows();
    }, ROW_REMEASURE_MS);
  }

  private remeasureRows(): void {
    this.initSwiper();
    this.initCompanionsSwiper();
  }
}
