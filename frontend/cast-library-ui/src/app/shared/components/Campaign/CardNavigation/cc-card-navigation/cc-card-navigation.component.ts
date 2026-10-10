import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, Input, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';
import { CcLocationCardComponent } from '../../../Shared/cc-location-card/cc-location-card.component';
import { CcSublocationCardComponent } from '../../../Shared/cc-sublocation-card/cc-sublocation-card.component';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcCastCardComponent } from '../../../Shared/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCardFadeDirective, cardFadeWindowMs } from '../../../../directives/cc-card-fade.directive';
import { CcCardSpotlightComponent } from '../../Shared/cc-card-spotlight/cc-card-spotlight.component';
import { CcTreeJointComponent } from '../../Shared/cc-tree-joint/cc-tree-joint.component';
import { CcCardTypeSelectorComponent, CardType as CardFilter } from '../cc-card-type-selector/cc-card-type-selector.component';
import { CcCardWatermarkComponent, CardSymbol } from '../cc-card-watermark/cc-card-watermark.component';
import { CampaignLocationInstance } from '../../../../models/location.model';
import { CampaignSublocationInstance } from '../../../../models/sublocation.model';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignSecret, CardVisibilityChangedEvent, BulkCardVisibilityChangedEvent } from '../../../../models/secret.model';
import { moveCastTo, replaceCard, setCardsVisibility } from '../../../../models/campaign-card-state';
import { DrawerService } from '../../../../../core/drawer.service';
import { CampaignHubService, CastTraveledEvent } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { GridAreaChangeService } from '../../../../../core/grid-area-change.service';
import { CardSpotlightService } from '../../../../../core/card-spotlight.service';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

function settleRow<T>(row: T[], collection: T[], key: (item: T) => string, belongs: (item: T) => boolean): T[] {
  const inScope = collection.filter(belongs);
  const byKey = new Map(inScope.map(item => [key(item), item]));

  const kept = row.flatMap(item => {
    const current = byKey.get(key(item));
    return current ? [current] : [];
  });
  const known = new Set(kept.map(key));

  return [...kept, ...inScope.filter(item => !known.has(key(item)))];
}

const CARD_NUDGE_MS = 900;

@Component({
  selector: 'app-cc-card-navigation',
  standalone: true,
  imports: [CommonModule, CcLocationCardComponent, CcSublocationCardComponent, CcSimpleLocationCardComponent, CcSimpleSublocationCardComponent, CcCastCardComponent, CcSimpleCastCardComponent, CcCardFadeDirective, CcCardSpotlightComponent, CcTreeJointComponent, CcCardTypeSelectorComponent, CcCardWatermarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-navigation.component.html',
  styleUrl: './cc-card-navigation.component.scss'
})
export class CcCardNavigationComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private drawerService = inject(DrawerService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private areaChange = inject(GridAreaChangeService);
  private spotlight = inject(CardSpotlightService);
  private hubSubscriptions: Subscription[] = [];

  readonly isDm = this.shellSvc.isDm;

  readonly isPlayer = this.shellSvc.isPlayer;

  private readonly mark = publishGridAreaMark('middle-middle', 'content', {
    title: () => ['The Realm of', this.shellSvc.campaign()?.name ?? ''],
    icon: { path: '/tarot_cards_star.svg', width: 44, height: 54 },
  });

  @ViewChildren('dropSpots') dropSpots!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('topRowCard') topRowCard!: ElementRef<HTMLElement>;
  @ViewChild('middleRow') middleRow!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  @Input() campaignId: string = '';

  internalCampaignId = signal<string>('');
  
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  locations = signal<CampaignLocationInstance[]>([]);
  sublocations = signal<CampaignSublocationInstance[]>([]);
  casts = signal<CampaignCastInstance[]>([]);

  private readonly sublocationsByLocation = computed(() => {
    const byLocation = new Map<string, CampaignSublocationInstance[]>();
    for (const sublocation of this.sublocations()) {
      const siblings = byLocation.get(sublocation.locationInstanceId);
      if (siblings) siblings.push(sublocation);
      else byLocation.set(sublocation.locationInstanceId, [sublocation]);
    }
    return byLocation;
  });

  private readonly castsBySublocation = computed(() => {
    const bySublocation = new Map<string, CampaignCastInstance[]>();
    for (const cast of this.casts()) {
      const siblings = bySublocation.get(cast.sublocationInstanceId ?? '');
      if (siblings) siblings.push(cast);
      else bySublocation.set(cast.sublocationInstanceId ?? '', [cast]);
    }
    return bySublocation;
  });

  currentView = signal<'locations' | 'sublocations' | 'casts'>('locations');
  parentLocation = signal<CampaignLocationInstance | null>(null);
  parentSublocation = signal<CampaignSublocationInstance | null>(null);

  topRowCards = signal<CampaignLocationInstance[]>([]);
  topRowSublocations = signal<CampaignSublocationInstance[]>([]);
  middleRowLocations = signal<CampaignLocationInstance[]>([]);
  middleRowSublocations = signal<CampaignSublocationInstance[]>([]);
  middleRowCasts = signal<CampaignCastInstance[]>([]);
  bottomRowCards = signal<CampaignSublocationInstance[]>([]);

  filter = signal<CardFilter | null>(null);

  readonly isFiltering = computed(() => this.filter() !== null);

  readonly activeView = computed<CardFilter>(() => this.filter() ?? this.currentView());

  readonly watermarkName = computed<CardSymbol>(() => {
    switch (this.activeView()) {
      case 'locations': return 'location';
      case 'sublocations': return 'sublocation';
      default: return 'cast';
    }
  });

  private revealedToViewer<T extends { isVisibleToPlayers: boolean }>(cards: T[]): T[] {
    return this.isDm() ? cards : cards.filter(card => card.isVisibleToPlayers);
  }

  readonly visibleMiddleLocations = computed(() =>
    this.filter() === 'locations' ? this.revealedToViewer(this.locations()) : this.middleRowLocations());

  readonly visibleMiddleSublocations = computed(() =>
    this.filter() === 'sublocations' ? this.revealedToViewer(this.sublocations()) : this.middleRowSublocations());

  readonly visibleMiddleCasts = computed(() =>
    this.filter() === 'casts' ? this.revealedToViewer(this.casts()) : this.middleRowCasts());

  readonly visibleMiddleCount = computed(() => {
    switch (this.activeView()) {
      case 'locations': return this.visibleMiddleLocations().length;
      case 'sublocations': return this.visibleMiddleSublocations().length;
      default: return this.visibleMiddleCasts().length;
    }
  });

  deletingLocationId = signal<string | null>(null);
  deletingSublocationId = signal<string | null>(null);
  deletingCastId = signal<string | null>(null);
  deleteError = signal<string>('');

  transitioning = signal<boolean>(false);

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  private nudgeTimer: ReturnType<typeof setTimeout> | null = null;

  private locationTilts = new Map<string, number>();

  private sublocationTilts = new Map<string, number>();

  private castTilts = new Map<string, number>();

  ngOnInit() {
    this.internalCampaignId.set(this.campaignId);

    this.setupHubSubscriptions();
  }

  ngAfterViewInit() {
    this.loadCardData();
  }

  ngOnDestroy() {
    if (this.nudgeTimer !== null) {
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = null;
    }

    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupHubSubscriptions() {
    this.hubSubscriptions.push(
      this.hub.on('LocationInstanceUpdated', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        if (event.location) this.applyUpdatedLocation(event.location);
        else this.readLocationBack(event.campaignId, event.locationInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('SublocationInstanceUpdated', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        if (event.sublocation) this.applyUpdatedSublocation(event.sublocation);
        else this.readSublocationBack(event.campaignId, event.sublocationInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CastInstanceUpdated', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        if (event.cast) this.applyUpdatedCast(event.cast);
        else this.readCastBack(event.campaignId, event.castInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.cardsChanged.subscribe(campaignId => {
        if (!campaignId || campaignId !== this.internalCampaignId()) return;
        this.refreshCardData();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.castTraveledFromDrawer.subscribe(landing => {
        if (!landing || landing.campaignId !== this.internalCampaignId()) return;
        this.followCastTravel(landing.locationInstanceId, landing.sublocationInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CampaignNavChanged', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshCardData();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CardVisibilityChanged', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyCardVisibility(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('BulkCardVisibilityChanged', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyBulkCardVisibility(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CastTraveled', 'cc-card-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyCastTravel(event);
      })
    );
  }

  private refreshCardData() {
    if (!this.internalCampaignId()) return;

    Promise.all([
      this.http.get<CampaignLocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/locationinstances`).toPromise(),
      this.http.get<CampaignSublocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/sublocationinstances`).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([locationsData, sublocationsData, castsData]) => {
      const locations = locationsData || [];
      const sublocations = sublocationsData || [];
      const casts = castsData || [];

      this.locations.set(locations);
      this.sublocations.set(sublocations);
      this.casts.set(casts);

      const parentLocation = this.parentLocation();
      const parentSublocation = this.parentSublocation();

      const middleLocations = settleRow(
        this.middleRowLocations(), locations, l => l.instanceId, () => true);
      const middleSublocations = parentLocation
        ? settleRow(this.middleRowSublocations(), sublocations, s => s.instanceId,
            s => s.locationInstanceId === parentLocation.instanceId)
        : this.middleRowSublocations();
      const middleCasts = parentSublocation
        ? settleRow(this.middleRowCasts(), casts, c => c.instanceId,
            c => c.sublocationInstanceId === parentSublocation.instanceId)
        : this.middleRowCasts();

      const rowChanged =
        middleLocations.length !== this.middleRowLocations().length ||
        middleSublocations.length !== this.middleRowSublocations().length ||
        middleCasts.length !== this.middleRowCasts().length;

      this.middleRowLocations.set(middleLocations);
      this.middleRowSublocations.set(middleSublocations);
      this.middleRowCasts.set(middleCasts);

      this.bottomRowCards.set(
        settleRow(this.bottomRowCards(), sublocations, s => s.instanceId, () => true));

      this.topRowCards.update(list => list.map(l =>
        locations.find(current => current.instanceId === l.instanceId) ?? l));
      this.topRowSublocations.update(list => list.map(s =>
        sublocations.find(current => current.instanceId === s.instanceId) ?? s));
      this.parentLocation.update(l => (l ? locations.find(current => current.instanceId === l.instanceId) ?? l : l));
      this.parentSublocation.update(s =>
        (s ? sublocations.find(current => current.instanceId === s.instanceId) ?? s : s));

      if (rowChanged) {
        setTimeout(() => this.initializeSwiper(), 50);
      }
    }).catch(() => {
    });
  }

  private initializeSwiper() {
    if (this.middleRow) {
      if (this.swiper) {
        this.swiper.destroy(true, true);
      }

      this.swiper = new Swiper(this.middleRow.nativeElement, {
        modules: [FreeMode, Mousewheel],
        slidesPerView: 'auto',
        spaceBetween: 0,
        centeredSlides: true,
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
        observeParents: true,
        watchOverflow: true,
        watchSlidesProgress: true,
      });

    } else {
      console.error('middleRow element not found');
    }
  }
  
  loadCardData() {
    if (!this.internalCampaignId()) {
      console.error('No campaign ID provided');
      this.error.set('No campaign ID provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.http.get<CampaignLocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/locationinstances`).toPromise(),
      this.http.get<CampaignSublocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/sublocationinstances`).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([locationsData, sublocationsData, castsData]) => {
      this.locations.set(locationsData || []);
      this.sublocations.set(sublocationsData || []);
      this.casts.set(castsData || []);

      this.middleRowLocations.set(locationsData || []);
      this.bottomRowCards.set(sublocationsData || []);

      this.loading.set(false);
      this.gridLoad.report('middle-middle', 'content');

      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    }).catch(err => {
      console.error('Error loading card data:', err);
      this.error.set('Failed to load location data. Please try again.');
      this.loading.set(false);
      this.gridLoad.report('middle-middle', 'content');
    });
  }

  getSublocationsForLocation(locationId: string): CampaignSublocationInstance[] {
    return this.sublocationsByLocation().get(locationId) ?? [];
  }

  getCastsForSublocation(sublocationId: string): CampaignCastInstance[] {
    return this.castsBySublocation().get(sublocationId) ?? [];
  }

  hasRevealUnderLocation(locationInstanceId: string): boolean {
    return this.getSublocationsForLocation(locationInstanceId).some(sublocation =>
      this.revealed(sublocation.instanceId) || this.hasRevealUnderSublocation(sublocation.instanceId));
  }

  hasRevealUnderSublocation(sublocationInstanceId: string): boolean {
    return this.getCastsForSublocation(sublocationInstanceId)
      .some(cast => this.revealed(cast.instanceId));
  }

  private revealed(instanceId: string): boolean {
    return this.spotlight.spotlighted().has(instanceId);
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  locationTilt(instanceId: string): number {
    if (!this.locationTilts.has(instanceId)) {
      const magnitude = 2;
      this.locationTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.locationTilts.get(instanceId)!;
  }

  sublocationTilt(instanceId: string): number {
    if (!this.sublocationTilts.has(instanceId)) {
      this.sublocationTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.sublocationTilts.get(instanceId)!;
  }

  castTilt(instanceId: string): number {
    if (!this.castTilts.has(instanceId)) {
      this.castTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.castTilts.get(instanceId)!;
  }

  toggleLocationVisibility(location: CampaignLocationInstance) {
    const next = !location.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/locationinstances/${location.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.locations.update(locs => locs.map(l =>
        l.instanceId === location.instanceId ? { ...l, isVisibleToPlayers: next } : l
      ));
      this.middleRowLocations.update(locs => locs.map(l =>
        l.instanceId === location.instanceId ? { ...l, isVisibleToPlayers: next } : l
      ));
    });
  }

  readonly nudgingCardId = signal<string | null>(null);

  private nudgeCard(instanceId: string | null | undefined) {
    if (!instanceId) return;

    if (this.nudgeTimer !== null) {
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = null;
    }

    this.nudgingCardId.set(null);
    setTimeout(() => {
      this.nudgingCardId.set(instanceId);
      this.nudgeTimer = setTimeout(() => {
        this.nudgingCardId.set(null);
        this.nudgeTimer = null;
      }, CARD_NUDGE_MS);
    });
  }

  private parentLocationRevealed(locationInstanceId: string | null | undefined): boolean {
    if (!locationInstanceId) return true;
    return this.locations().find(l => l.instanceId === locationInstanceId)?.isVisibleToPlayers === true;
  }

  private parentSublocationRevealed(sublocationInstanceId: string | null | undefined): boolean {
    if (!sublocationInstanceId) return true;
    return this.sublocations().find(s => s.instanceId === sublocationInstanceId)?.isVisibleToPlayers === true;
  }

  sublocationRevealAvailable(sublocation: CampaignSublocationInstance): boolean {
    return sublocation.isVisibleToPlayers
      || this.parentLocationRevealed(sublocation.locationInstanceId);
  }

  castRevealAvailable(cast: CampaignCastInstance): boolean {
    return cast.isVisibleToPlayers
      || (cast.sublocationInstanceId
        ? this.parentSublocationRevealed(cast.sublocationInstanceId)
        : this.parentLocationRevealed(cast.locationInstanceId));
  }

  toggleSublocationVisibility(sublocation: CampaignSublocationInstance) {
    const next = !sublocation.isVisibleToPlayers;
    if (next && !this.sublocationRevealAvailable(sublocation)) {
      this.nudgeCard(sublocation.locationInstanceId);
      return;
    }
    this.http.patch(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/sublocationinstances/${sublocation.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.sublocations.update(subs => subs.map(s =>
        s.instanceId === sublocation.instanceId ? { ...s, isVisibleToPlayers: next } : s
      ));
      this.middleRowSublocations.update(subs => subs.map(s =>
        s.instanceId === sublocation.instanceId ? { ...s, isVisibleToPlayers: next } : s
      ));
      this.bottomRowCards.update(subs => subs.map(s =>
        s.instanceId === sublocation.instanceId ? { ...s, isVisibleToPlayers: next } : s
      ));
    });
  }

  toggleCastVisibility(cast: CampaignCastInstance) {
    const next = !cast.isVisibleToPlayers;
    if (next && !this.castRevealAvailable(cast)) {
      this.nudgeCard(cast.sublocationInstanceId ?? cast.locationInstanceId);
      return;
    }
    this.http.patch(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances/${cast.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.casts.update(casts => casts.map(c =>
        c.instanceId === cast.instanceId ? { ...c, isVisibleToPlayers: next } : c
      ));
      this.middleRowCasts.update(casts => casts.map(c =>
        c.instanceId === cast.instanceId ? { ...c, isVisibleToPlayers: next } : c
      ));
    });
  }

  private applyCardVisibility(event: CardVisibilityChangedEvent) {
    const { instanceId, isVisible } = event;

    switch (event.cardType) {
      case 'location':
        this.locations.update(list => setCardsVisibility(list, l => l.instanceId === instanceId, isVisible));
        this.middleRowLocations.update(list => setCardsVisibility(list, l => l.instanceId === instanceId, isVisible));
        break;

      case 'sublocation':
        this.sublocations.update(list => setCardsVisibility(list, s => s.instanceId === instanceId, isVisible));
        this.middleRowSublocations.update(list => setCardsVisibility(list, s => s.instanceId === instanceId, isVisible));
        this.bottomRowCards.update(list => setCardsVisibility(list, s => s.instanceId === instanceId, isVisible));
        break;

      case 'cast':
        this.casts.update(list => setCardsVisibility(list, c => c.instanceId === instanceId, isVisible));
        this.middleRowCasts.update(list => setCardsVisibility(list, c => c.instanceId === instanceId, isVisible));
        break;

      default:
        return;
    }

    if (isVisible && this.isPlayer()) {
      this.areaChange.notify('middle-middle');
      this.spotlight.reveal(instanceId);
    }
  }

  private applyBulkCardVisibility(event: BulkCardVisibilityChangedEvent) {
    if (event.cardType === 'sublocation') {
      const underParent = (card: CampaignSublocationInstance) =>
        card.locationInstanceId === event.parentInstanceId;

      this.sublocations.update(list => setCardsVisibility(list, underParent, event.isVisible));
      this.middleRowSublocations.update(list => setCardsVisibility(list, underParent, event.isVisible));
      this.bottomRowCards.update(list => setCardsVisibility(list, underParent, event.isVisible));
      return;
    }

    const underParent = (card: CampaignCastInstance) =>
      card.sublocationInstanceId === event.parentInstanceId;

    this.casts.update(list => setCardsVisibility(list, underParent, event.isVisible));
    this.middleRowCasts.update(list => setCardsVisibility(list, underParent, event.isVisible));
  }

  private applyCastTravel(event: CastTraveledEvent) {
    const sublocationInstanceId = event.isVisible
      ? event.toSublocationInstanceId
      : event.fromSublocationInstanceId;
    const locationInstanceId = event.toLocationInstanceId;

    const move = (list: CampaignCastInstance[]) =>
      moveCastTo(list, c => c.instanceId === event.castInstanceId, sublocationInstanceId, locationInstanceId);

    this.casts.update(move);
    this.middleRowCasts.update(move);
  }

  private applyUpdatedLocation(updated: CampaignLocationInstance) {
    const belongs = (l: CampaignLocationInstance) => l.instanceId === updated.instanceId;

    this.locations.update(list => replaceCard(list, belongs, updated));
    this.middleRowLocations.update(list => replaceCard(list, belongs, updated));
    this.topRowCards.update(list => replaceCard(list, belongs, updated));
    this.parentLocation.update(l => (l && belongs(l) ? updated : l));
  }

  private applyUpdatedSublocation(updated: CampaignSublocationInstance) {
    const belongs = (s: CampaignSublocationInstance) => s.instanceId === updated.instanceId;

    this.sublocations.update(list => replaceCard(list, belongs, updated));
    this.middleRowSublocations.update(list => replaceCard(list, belongs, updated));
    this.bottomRowCards.update(list => replaceCard(list, belongs, updated));
    this.topRowSublocations.update(list => replaceCard(list, belongs, updated));
    this.parentSublocation.update(s => (s && belongs(s) ? updated : s));
  }

  private applyUpdatedCast(updated: CampaignCastInstance) {
    const belongs = (c: CampaignCastInstance) => c.instanceId === updated.instanceId;

    this.casts.update(list => replaceCard(list, belongs, updated));
    this.middleRowCasts.update(list => replaceCard(list, belongs, updated));
  }

  private readLocationBack(campaignId: string, instanceId: string) {
    this.http.get<CampaignLocationInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/locationinstances/${instanceId}`
    ).subscribe({
      next: updated => this.applyUpdatedLocation(updated),
      error: () => this.refreshCardData(),
    });
  }

  private readSublocationBack(campaignId: string, instanceId: string) {
    this.http.get<CampaignSublocationInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}`
    ).subscribe({
      next: updated => this.applyUpdatedSublocation(updated),
      error: () => this.refreshCardData(),
    });
  }

  private readCastBack(campaignId: string, instanceId: string) {
    this.http.get<CampaignCastInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${instanceId}`
    ).subscribe({
      next: updated => this.applyUpdatedCast(updated),
      error: () => this.refreshCardData(),
    });
  }

  deleteLocation(location: CampaignLocationInstance) {
    if (!this.isDm()) return;
    if (this.getSublocationsForLocation(location.instanceId).length) return;
    if (this.deletingLocationId()) return;

    this.deletingLocationId.set(location.instanceId);
    this.deleteError.set('');

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/locationinstances/${location.instanceId}`
    ).subscribe({
      next: () => {
        const drop = (list: CampaignLocationInstance[]) =>
          list.filter(l => l.instanceId !== location.instanceId);

        this.locations.update(drop);
        this.middleRowLocations.update(drop);
        this.topRowCards.update(drop);
        this.parentLocation.update(p => (p && p.instanceId === location.instanceId ? null : p));

        this.deletingLocationId.set(null);
        this.shellSvc.publishCardsChanged(this.internalCampaignId());
      },
      error: () => {
        this.deletingLocationId.set(null);
        this.deleteError.set(`Could not delete ${location.name}.`);
      },
    });
  }

  deleteSublocation(sublocation: CampaignSublocationInstance) {
    if (!this.isDm()) return;
    if (this.getCastsForSublocation(sublocation.instanceId).length) return;
    if (this.deletingSublocationId()) return;

    this.deletingSublocationId.set(sublocation.instanceId);
    this.deleteError.set('');

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/sublocationinstances/${sublocation.instanceId}`
    ).subscribe({
      next: () => {
        const drop = (list: CampaignSublocationInstance[]) =>
          list.filter(s => s.instanceId !== sublocation.instanceId);

        this.sublocations.update(drop);
        this.middleRowSublocations.update(drop);
        this.topRowSublocations.update(drop);
        this.bottomRowCards.update(drop);
        this.parentSublocation.update(s => (s && s.instanceId === sublocation.instanceId ? null : s));

        this.deletingSublocationId.set(null);
        this.shellSvc.publishCardsChanged(this.internalCampaignId());
      },
      error: () => {
        this.deletingSublocationId.set(null);
        this.deleteError.set(`Could not delete ${sublocation.name}.`);
      },
    });
  }

  deleteCast(cast: CampaignCastInstance) {
    if (!this.isDm()) return;
    if (this.deletingCastId()) return;

    this.deletingCastId.set(cast.instanceId);
    this.deleteError.set('');

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances/${cast.instanceId}`
    ).subscribe({
      next: () => {
        const drop = (list: CampaignCastInstance[]) =>
          list.filter(c => c.instanceId !== cast.instanceId);

        this.casts.update(drop);
        this.middleRowCasts.update(drop);
        this.deletingCastId.set(null);
      },
      error: () => {
        this.deletingCastId.set(null);
        this.deleteError.set(`Could not delete ${cast.name}.`);
      },
    });
  }

  goToLocationDetail(instanceId: string) {
    const location = this.locations().find(l => l.instanceId === instanceId);
    if (!location) return;

    const secrets: CampaignSecret[] = [];
    this.drawerService.openLocationDetail({
      location,
      secrets,
      campaignId: this.internalCampaignId()
    });
  }

  navigateToSublocations(location: CampaignLocationInstance) {
    if (this.getSublocationsForLocation(location.instanceId).length === 0) return;

    this.beginTransition(() => {
      this.topRowCards.set([location]);
      this.middleRowLocations.set([]);
      this.middleRowSublocations.set(this.getSublocationsForLocation(location.instanceId));
      this.middleRowCasts.set([]);
      this.bottomRowCards.set([]);
      this.parentLocation.set(location);
      this.parentSublocation.set(null);
      this.currentView.set('sublocations');
    });
  }

  navigateToCasts(sublocation: CampaignSublocationInstance) {
    if (this.getCastsForSublocation(sublocation.instanceId).length === 0) return;

    this.beginTransition(() => {
      this.topRowSublocations.set([sublocation]);
      this.topRowCards.set([]);
      this.middleRowCasts.set(this.getCastsForSublocation(sublocation.instanceId));
      this.middleRowSublocations.set([]);
      this.bottomRowCards.set([]);
      this.parentSublocation.set(sublocation);
      this.currentView.set('casts');
    });
  }

  followCastTravel(locationInstanceId: string, sublocationInstanceId: string) {
    const sublocation = this.sublocations().find(s => s.instanceId === sublocationInstanceId);
    if (!sublocation) return;

    const location = this.locations().find(l => l.instanceId === locationInstanceId)
      ?? this.parentLocation();

    this.beginTransition(() => {
      this.topRowSublocations.set([sublocation]);
      this.topRowCards.set([]);
      this.middleRowLocations.set([]);
      this.middleRowSublocations.set([]);
      this.middleRowCasts.set(this.getCastsForSublocation(sublocation.instanceId));
      this.bottomRowCards.set([]);
      this.parentLocation.set(location);
      this.parentSublocation.set(sublocation);
      this.currentView.set('casts');
    });
  }

  openLocationPicker() {
    this.shellSvc.openLocationPickerDrawer(this.internalCampaignId());
  }

  openSublocationPicker(location: CampaignLocationInstance) {
    this.shellSvc.openSublocationPickerDrawer(
      this.internalCampaignId(), location.instanceId, location.name);
  }

  openCastPicker(sublocation: CampaignSublocationInstance) {
    const parentLocation = this.parentLocation()
      ?? this.locations().find(l => l.instanceId === sublocation.locationInstanceId)
      ?? null;
    if (!parentLocation) return;

    this.shellSvc.openCastPickerDrawer(
      this.internalCampaignId(),
      parentLocation.instanceId,
      sublocation.instanceId,
      sublocation.name
    );
  }

  navigateToLocations() {
    this.beginTransition(() => {
      this.middleRowLocations.set(this.locations());
      this.middleRowSublocations.set([]);
      this.middleRowCasts.set([]);
      this.topRowCards.set([]);
      this.bottomRowCards.set(this.sublocations());
      this.parentLocation.set(null);
      this.parentSublocation.set(null);
      this.currentView.set('locations');
    });
  }

  isFilterOn(kind: CardFilter): boolean {
    return this.filter() === kind;
  }

  toggleFilter(kind: CardFilter) {
    const next = this.filter() === kind ? null : kind;
    if (next === this.filter()) return;

    this.beginTransition(() => this.filter.set(next));
  }

  navigateToSublocationsFromCasts() {
    this.beginTransition(() => {
      const parentLoc = this.parentLocation();
      if (parentLoc) {
        this.middleRowSublocations.set(this.getSublocationsForLocation(parentLoc.instanceId));
      } else {
        this.middleRowSublocations.set(this.topRowSublocations());
      }

      this.middleRowCasts.set([]);
      this.topRowCards.set(this.locations());
      this.topRowSublocations.set([]);
      this.bottomRowCards.set([]);
      this.parentSublocation.set(null);
      this.currentView.set('sublocations');
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

    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }
}
