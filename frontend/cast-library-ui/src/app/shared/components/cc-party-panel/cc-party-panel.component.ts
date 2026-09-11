import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, afterNextRender, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../environments/environment';
import { PlayerCardWithDetails } from '../../models/player-card.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CastingCardPlayerComponent } from '../casting-card-player/casting-card-player.component';
import { SimplePlayerCardComponent } from '../simple-player-card/simple-player-card.component';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { SimpleCastCardComponent } from '../simple-cast-card/simple-cast-card.component';
import { V2CampaignShellService } from '../../../core/v2-campaign-shell.service';

@Component({
  selector: 'app-cc-party-panel',
  standalone: true,
  imports: [CommonModule, CastingCardPlayerComponent, SimplePlayerCardComponent, CastCardComponent, SimpleCastCardComponent],
  templateUrl: './cc-party-panel.component.html',
  styleUrl: './cc-party-panel.component.scss',
})
export class CcPartyPanelComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private shellSvc = inject(V2CampaignShellService);
  private injector = inject(Injector);

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

  private playerCardSwiperEffect = effect(() => {
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

  private companionsSwiperEffect = effect(() => {
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

  private playerCardTiltMap = new Map<string, number>();
  private companionTiltMap = new Map<string, number>();

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
      .subscribe(cards => {
        this.playerCards.set(cards);
      });

    this.partyGoldAwardedSubscription = this.shellSvc.partyGoldAwarded.subscribe(response => {
      this.onPartyGoldAwarded(response);
    });
  }

  ngOnDestroy() {
    this.partyGoldAwardedSubscription?.unsubscribe();
    this.playerCardSwiperEffect.destroy();
    this.companionsSwiperEffect.destroy();
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

  onCompanionCardClick() {
    if (this.companionsExpanded()) return;
    this.companionsExpanded.set(true);
    afterNextRender(() => {
      this.swiper?.update();
      this.companionsSwiper?.update();
    }, { injector: this.injector });
  }

  onPlayerCardClick() {
    if (!this.companionsExpanded()) return;
    this.companionsExpanded.set(false);
    afterNextRender(() => {
      this.swiper?.update();
      this.companionsSwiper?.update();
    }, { injector: this.injector });
  }

  goToCompanion(cast: CampaignCastInstance) {
    const sublocationId = this.partySublocationInstanceId();
    if (!sublocationId) return;
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', sublocationId, 'cast', cast.instanceId]);
  }
}
