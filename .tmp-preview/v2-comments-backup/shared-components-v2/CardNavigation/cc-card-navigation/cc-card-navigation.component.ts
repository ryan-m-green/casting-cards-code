import { Component, ChangeDetectionStrategy, inject, signal, computed, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, Input, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';
import { CcLocationCardComponent } from '../../carddeck/cc-location-card/cc-location-card.component';
import { CcSublocationCardComponent } from '../../carddeck/cc-sublocation-card/cc-sublocation-card.component';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCardFadeDirective, cardFadeWindowMs } from '../../../../directives/cc-card-fade.directive';
import { CcCardSpotlightComponent } from '../../Shared/cc-card-spotlight/cc-card-spotlight.component';
import { CcTreeJointComponent } from '../../Shared/cc-tree-joint/cc-tree-joint.component';
import { CampaignLocationInstance } from '../../../../models/location.model';
import { CampaignSublocationInstance } from '../../../../models/sublocation.model';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignSecret, CardVisibilityChangedEvent, BulkCardVisibilityChangedEvent } from '../../../../models/secret.model';
import { moveCastTo, replaceCard, setCardsVisibility } from '../../../../models/campaign-card-state';
import { DrawerService } from '../../../../../core/drawer.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { CampaignHubService, CastTraveledEvent } from '../../../../../core/hub/campaign-hub.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { V2AreaChangeService } from '../../../../../core/v2-area-change.service';
import { V2SpotlightService } from '../../../../../core/v2-spotlight.service';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

/**
 * A row put back in step with the collection behind it: the entries the row already holds, in
 * the server's own version of them and in the row's own order, with anything the campaign has
 * gained joined at the end. `belongs` says which of the collection's entries this row is even
 * about — the sublocations row is one location's children, not the campaign's whole set.
 */
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

@Component({
  selector: 'app-cc-card-navigation',
  standalone: true,
  imports: [CommonModule, CcLocationCardComponent, CcSublocationCardComponent, CcSimpleLocationCardComponent, CcSimpleSublocationCardComponent, CcCastCardComponent, CcSimpleCastCardComponent, CcCardFadeDirective, CcCardSpotlightComponent, CcTreeJointComponent],
  /**
   * OnPush: the row is redrawn when something of its own moves — a card added, a card's lock
   * worked (see `applyCardVisibility`), a card the viewer clicked — and not when a ticket is rung
   * for something else on the page. Everything the template reads is a signal, a signal pair from
   * this component's own bindings, or state its own events set (the tilts), so the row needs no
   * `markForCheck` of its own; the cards it draws are OnPush too, and take a new card only when the
   * object they were handed changes.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-navigation.component.html',
  styleUrl: './cc-card-navigation.component.scss'
})
export class CcCardNavigationComponent implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private drawerService = inject(DrawerService);
  private auth = inject(AuthService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(V2CampaignShellService);
  private gridLoad = inject(V2GridLoadService);
  private areaChange = inject(V2AreaChangeService);
  private spotlight = inject(V2SpotlightService);
  private hubSubscriptions: Subscription[] = [];

  /** Whether the viewer is a GM: the only one the cast cards' delete controls are drawn for. */
  readonly isDm = this.auth.isDm;

  /** Whether the viewer is a player: the only one a revealed card is lit for. */
  readonly isPlayer = this.auth.isPlayer;

  /**
   * What the middle-middle area is known by — the heading over the board's heart, and the star it
   * wears on the radial navigator's own centre — published for as long as this row stands in the
   * area (see V2GridAreaMarkService).
   *
   * The row is built before the shell has read the campaign (it is not waiting on it, the way the
   * top middle's panels are), so the campaign's name is read as the heading is drawn rather than
   * written into the line here: a name captured at this point would be the empty one.
   */
  private readonly mark = publishGridAreaMark('middle-middle', 'content', {
    title: () => ['The Realm of', this.shellSvc.campaign()?.name ?? ''],
    icon: { path: '/tarot_cards_star.svg', width: 44, height: 54 },
  });

  @ViewChildren('dropSpots') dropSpots!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('topRowCard') topRowCard!: ElementRef<HTMLElement>;
  @ViewChild('middleRow') middleRow!: ElementRef<HTMLElement>;

  // Swiper instance for middle row
  private swiper: Swiper | null = null;

  // Input for campaign ID (public property for Angular binding)
  @Input() campaignId: string = '';

  // Internal campaign ID signal
  internalCampaignId = signal<string>('');
  
  // Loading states
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Card data
  locations = signal<CampaignLocationInstance[]>([]);
  sublocations = signal<CampaignSublocationInstance[]>([]);
  casts = signal<CampaignCastInstance[]>([]);

  /**
   * The campaign's sublocations, by the location they stand in, and its casts, by the sublocation
   * they stand in.
   *
   * The stacks under the cards ask for a card's children on every check — the template asks three
   * times for each card it draws — so the children are grouped once, when the collection behind
   * them changes, rather than filtered afresh on every ask: a lookup per ask, and a rebuild per
   * change to the collection (an unlock, a card added, a re-read), instead of a filter and its
   * array per card per check.
   */
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

  // Navigation state for 3-row system
  currentView = signal<'locations' | 'sublocations' | 'casts'>('locations');
  parentLocation = signal<CampaignLocationInstance | null>(null);
  parentSublocation = signal<CampaignSublocationInstance | null>(null);

  // Row states
  topRowCards = signal<CampaignLocationInstance[]>([]);
  topRowSublocations = signal<CampaignSublocationInstance[]>([]);
  middleRowLocations = signal<CampaignLocationInstance[]>([]);
  middleRowSublocations = signal<CampaignSublocationInstance[]>([]);
  middleRowCasts = signal<CampaignCastInstance[]>([]);
  bottomRowCards = signal<CampaignSublocationInstance[]>([]);

  // Deleting a card from the campaign: the card whose write is in flight, and a delete that did
  // not land. The same error line serves all three kinds (see `deleteLocation`, `deleteSublocation`
  // and `deleteCast`).
  deletingLocationId = signal<string | null>(null);
  deletingSublocationId = signal<string | null>(null);
  deletingCastId = signal<string | null>(null);
  deleteError = signal<string>('');

  /**
   * Whether the row is taking its cards away before it swaps them for the new ones. Raised by
   * `beginTransition` and bound to every card as `ccCardFadeOut`, so each card fades where it
   * stands (see CcCardFadeDirective).
   */
  transitioning = signal<boolean>(false);

  /** The swap waiting on the cards to fade away, so that leaving can call it off. */
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  // Location tilt tracking
  private locationTilts = new Map<string, number>();

  // Sublocation tilt tracking
  private sublocationTilts = new Map<string, number>();

  // Cast tilt tracking
  private castTilts = new Map<string, number>();

  ngAfterViewInit() {
    // Set internal campaign ID from input
    this.internalCampaignId.set(this.campaignId);

    // Load card data
    this.loadCardData();

    // Subscribe to card instance updates
    this.setupHubSubscriptions();
  }

  ngOnDestroy() {
    // A swap still waiting on the cards to fade away goes with the row
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Destroy Swiper instance to prevent memory leaks
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    // Clean up hub subscriptions
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupHubSubscriptions() {
    // A card of the campaign was written, here or on another screen. The card travels with the
    // event now, so the row takes the server's copy of it straight from the payload — no read back,
    // and one card's redraw. A server that does not send it yet sends the id alone, and then the
    // card is read back the way it always was.
    this.hubSubscriptions.push(
      this.hub.locationInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        if (event.location) this.applyUpdatedLocation(event.location);
        else this.readLocationBack(event.campaignId, event.locationInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.sublocationInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        if (event.sublocation) this.applyUpdatedSublocation(event.sublocation);
        else this.readSublocationBack(event.campaignId, event.sublocationInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.castInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        if (event.cast) this.applyUpdatedCast(event.cast);
        else this.readCastBack(event.campaignId, event.castInstanceId);
      })
    );

    // Cards were added to the campaign from this row's own ＋ tiles: re-read the card
    // collections so a new sublocation or cast joins the row it belongs to here too.
    this.hubSubscriptions.push(
      this.shellSvc.cardsChanged.subscribe(campaignId => {
        if (!campaignId || campaignId !== this.internalCampaignId()) return;
        this.refreshCardData();
      })
    );

    // A card was moved from the travel drawer and the drawer has since shut (see
    // cc-cast-travel-picker): the row follows the cast to the place it now stands in.
    this.hubSubscriptions.push(
      this.shellSvc.castTraveledFromDrawer.subscribe(landing => {
        if (!landing || landing.campaignId !== this.internalCampaignId()) return;
        this.followCastTravel(landing.locationInstanceId, landing.sublocationInstanceId);
      })
    );

    // The campaign's card rows changed elsewhere — a card added or taken out in another screen:
    // re-read so the rows here show the campaign as it stands.
    this.hubSubscriptions.push(
      this.hub.campaignNavChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshCardData();
      })
    );

    // A card's own lock was worked — the ✦ control on a card in this very row, or on that card's
    // detail panel elsewhere: every watcher's row takes the new state on straight from the event,
    // the DM who wrote it included, whose own write comes back through the campaign group like
    // anyone else's. It is what unlocks a card for the players the moment the DM unlocks it — and
    // with it the cards standing under that card, which a viewer without the GM's role only sees
    // while the lock above them is open (see the role note in the template).
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyCardVisibility(event);
      })
    );

    // A card was locked or unlocked together with the whole ring of cards under it (the sweep
    // controls on a card's detail panel, see the API's BulkCardVisibilityChanged): every child of
    // the parent the event names takes the new state, so a player's row follows the sweep.
    // A cast card was sent somewhere else in the campaign — by the travel drawer on this screen, or
    // on another screen the DM is working from: the collections the stacks are resolved through
    // take the new place on straight from the event, so the card leaves the stack it was standing
    // in and stands in the one it travelled to, on every viewer's row and without a re-read.
    //
    // This is the half of a travel the drawer could not do for itself. The drawer publishes
    // `castTraveledFromDrawer` on the client that used it, which only walks that client's row to
    // the place the card went (see the subscription above); the card has to be *there* to be walked
    // to, and it is this event that puts it there — on the writer's client and on everyone else's.
    this.hubSubscriptions.push(
      this.hub.castTravel$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyCastTravel(event);
      })
    );
  }

  /**
   * Re-reads the campaign's three card collections and settles them into the rows. The rows keep
   * their own order — what is on a row stays exactly where it is, in the server's version of it,
   * one that has gone leaves, and one the campaign has gained joins the end — so adding a card
   * never shuffles the row under the DM's hand. The stacks under the cards need no settling of
   * their own: they are resolved through `getSublocationsForLocation` and `getCastsForSublocation`,
   * which read these collections.
   */
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

      // The third row's stacks are all the campaign's sublocations, kept in the server's version.
      this.bottomRowCards.set(
        settleRow(this.bottomRowCards(), sublocations, s => s.instanceId, () => true));

      // The breadcrumbs take the server's copy of what they hold. A parent that has gone keeps
      // its place on the row as it was, so the row the DM is looking at is not emptied under them.
      this.topRowCards.update(list => list.map(l =>
        locations.find(current => current.instanceId === l.instanceId) ?? l));
      this.topRowSublocations.update(list => list.map(s =>
        sublocations.find(current => current.instanceId === s.instanceId) ?? s));
      this.parentLocation.update(l => (l ? locations.find(current => current.instanceId === l.instanceId) ?? l : l));
      this.parentSublocation.update(s =>
        (s ? sublocations.find(current => current.instanceId === s.instanceId) ?? s : s));

      // A row gained or lost a slide: Swiper is rebuilt over the new ones.
      if (rowChanged) {
        setTimeout(() => this.initializeSwiper(), 50);
      }
    }).catch(() => {
      // A failed re-read leaves the rows as they stand — the next hub event tries again.
    });
  }

  private initializeSwiper() {
    if (this.middleRow) {
      // Destroy existing swiper if any
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

    // Load location, sublocation, and cast data in parallel
    Promise.all([
      this.http.get<CampaignLocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/locationinstances`).toPromise(),
      this.http.get<CampaignSublocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/sublocationinstances`).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([locationsData, sublocationsData, castsData]) => {
      this.locations.set(locationsData || []);
      this.sublocations.set(sublocationsData || []);
      this.casts.set(castsData || []);

      // Initialize row states
      this.middleRowLocations.set(locationsData || []);
      this.bottomRowCards.set(sublocationsData || []);

      this.loading.set(false);
      this.gridLoad.report('middle-middle', 'content');

      // Initialize Swiper after data is loaded and DOM is rendered
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

  // Get sublocations for a specific location — a lookup in the grouping above, so the three asks
  // each card makes per check cost a map read rather than a filter over every sublocation.
  getSublocationsForLocation(locationId: string): CampaignSublocationInstance[] {
    return this.sublocationsByLocation().get(locationId) ?? [];
  }

  // Get casts for a specific sublocation — a lookup in the grouping above, as above.
  getCastsForSublocation(sublocationId: string): CampaignCastInstance[] {
    return this.castsBySublocation().get(sublocationId) ?? [];
  }

  /**
   * Whether a card buried under a location was revealed for the viewer and has not been seen yet:
   * one of its own sublocations, or a cast standing in one of them.
   *
   * A reveal lands on the card it happened to, but the viewer may be looking higher up than that,
   * so the row points the way down instead: the location's card stands in for whatever under it
   * was revealed (see cc-card-spotlight's `pointsDown`), and going in turns up the same light on
   * that card itself. Nothing is written down for it — it is read back off the revealed set here,
   * so a reveal that has been seen (its pool clicked away) stops pointing at once.
   */
  hasRevealUnderLocation(locationInstanceId: string): boolean {
    return this.getSublocationsForLocation(locationInstanceId).some(sublocation =>
      this.revealed(sublocation.instanceId) || this.hasRevealUnderSublocation(sublocation.instanceId));
  }

  /** Whether a cast standing under a sublocation was revealed for the viewer and has not been seen. */
  hasRevealUnderSublocation(sublocationInstanceId: string): boolean {
    return this.getCastsForSublocation(sublocationInstanceId)
      .some(cast => this.revealed(cast.instanceId));
  }

  /** Whether a card of this instance id was revealed for the viewer and has not been seen yet. */
  private revealed(instanceId: string): boolean {
    return this.spotlight.spotlighted().has(instanceId);
  }

  // Helper method for Math.abs() to use in templates
  abs(value: number): number {
    return Math.abs(value);
  }

  // Location tilt for visual variation
  locationTilt(instanceId: string): number {
    if (!this.locationTilts.has(instanceId)) {
      const magnitude = 2;
      this.locationTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.locationTilts.get(instanceId)!;
  }

  // Sublocation tilt for visual variation
  sublocationTilt(instanceId: string): number {
    if (!this.sublocationTilts.has(instanceId)) {
      this.sublocationTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.sublocationTilts.get(instanceId)!;
  }

  // Cast tilt for visual variation
  castTilt(instanceId: string): number {
    if (!this.castTilts.has(instanceId)) {
      this.castTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.castTilts.get(instanceId)!;
  }

  // Toggle location visibility
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

  // Toggle sublocation visibility
  toggleSublocationVisibility(sublocation: CampaignSublocationInstance) {
    const next = !sublocation.isVisibleToPlayers;
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

  // Toggle cast visibility
  toggleCastVisibility(cast: CampaignCastInstance) {
    const next = !cast.isVisibleToPlayers;
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

  /**
   * A card's own lock came in over the hub (see the API's CardVisibilityChanged): the instance
   * takes the new state everywhere this panel holds a copy of it — the collection the stacks are
   * resolved through, and the row at the middle of the board — which is exactly the state the GM's
   * own toggle leaves behind here, so a lock worked anywhere on the campaign lands the same way.
   *
   * This is how a card unlocks for the players: the DM's toggle writes the lock, the API broadcasts
   * it, and a player's row opens the card, and the cards under it, without a reload.
   */
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
        // The other card types the event carries (factions, events, handouts, players, secrets)
        // are not this panel's rows, so they are left to the panels that draw them — and leave
        // the board's middle button alone.
        return;
    }

    // A card this panel draws came out of the lock. The light that says so is the players' alone
    // — the DM and the Admin wrote the lock, so there is nothing for them to be shown (see
    // `isPlayer`). The board's middle button is lit, and the revealed card itself takes a
    // spotlight (see cc-card-spotlight) until the viewer clicks the light away.
    if (isVisible && this.isPlayer()) {
      this.areaChange.notify('middle-middle');
      this.spotlight.reveal(instanceId);
    }
  }

  /**
   * A card went into, or came out of, the lock together with every card under it (see the API's
   * BulkCardVisibilityChanged): the children of the parent the event names take the new state, in
   * the collection and in whichever row is holding them.
   */
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

  /**
   * A cast's place in the campaign changed (see the API's CastTraveled): the card is written into
   * the sublocation it travelled to — or the one it came from, when the event says the move is not
   * one the viewers are to see — everywhere this panel holds a copy of it, the way a lock is
   * written by `applyCardVisibility`.
   *
   * Nothing is drawn directly here: the stacks under the cards are resolved from the collection, so
   * a card written into its new sublocation leaves the stack it was standing in and joins the one
   * it arrived at, and the row at the middle of the board follows with it. That is what takes the
   * card out of the realm tree and puts it in with the party when the card travels to them — for
   * players, whose row is their own, as much as for the DM.
   */
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

  // ── A card was written elsewhere ─────────────────────────────────────────────

  /**
   * The campaign's copy of one location, put in every list that holds it: the collection the stacks
   * are resolved through, the row at the middle of the board, and the breadcrumb that may be
   * standing on it. Only the card that changed is copied and a list that does not hold it is handed
   * back as it stands, so a card written on another screen costs one card's redraw here (see
   * `setCardVisibility` for the same shape of write).
   */
  private applyUpdatedLocation(updated: CampaignLocationInstance) {
    const belongs = (l: CampaignLocationInstance) => l.instanceId === updated.instanceId;

    this.locations.update(list => replaceCard(list, belongs, updated));
    this.middleRowLocations.update(list => replaceCard(list, belongs, updated));
    this.topRowCards.update(list => replaceCard(list, belongs, updated));
    this.parentLocation.update(l => (l && belongs(l) ? updated : l));
  }

  /** The same for one sublocation: the collection, both rows that can hold it, and the breadcrumb. */
  private applyUpdatedSublocation(updated: CampaignSublocationInstance) {
    const belongs = (s: CampaignSublocationInstance) => s.instanceId === updated.instanceId;

    this.sublocations.update(list => replaceCard(list, belongs, updated));
    this.middleRowSublocations.update(list => replaceCard(list, belongs, updated));
    this.bottomRowCards.update(list => replaceCard(list, belongs, updated));
    this.topRowSublocations.update(list => replaceCard(list, belongs, updated));
    this.parentSublocation.update(s => (s && belongs(s) ? updated : s));
  }

  /** The same for one cast: the collection and the row drawn from it. */
  private applyUpdatedCast(updated: CampaignCastInstance) {
    const belongs = (c: CampaignCastInstance) => c.instanceId === updated.instanceId;

    this.casts.update(list => replaceCard(list, belongs, updated));
    this.middleRowCasts.update(list => replaceCard(list, belongs, updated));
  }

  /** An event without the card on it (an older server): the card is read back, as it always was. */
  private readLocationBack(campaignId: string, instanceId: string) {
    this.http.get<CampaignLocationInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/locationinstances/${instanceId}`
    ).subscribe(updated => this.applyUpdatedLocation(updated));
  }

  private readSublocationBack(campaignId: string, instanceId: string) {
    this.http.get<CampaignSublocationInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}`
    ).subscribe(updated => this.applyUpdatedSublocation(updated));
  }

  private readCastBack(campaignId: string, instanceId: string) {
    this.http.get<CampaignCastInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${instanceId}`
    ).subscribe(updated => this.applyUpdatedCast(updated));
  }

  /**
   * Takes a location out of the campaign — the card's own back-face delete control, whose dagger asks
   * before anything is written (see cc-location-card), and which is only drawn for a GM (see the
   * template) and for a location holding no sublocation. A location with sublocations standing under
   * it is left alone: those cards hang off it, so it has to be emptied first — the rule the faction
   * row keeps for a faction holding casts (see cc-card-faction-navigation).
   *
   * The row drops the card as soon as the write lands, and the campaign is told the cards changed, so
   * everything that reads the campaign behind this row — the pickers that would otherwise still offer
   * the location a cast could be sent to — shows the realm as it stands and not the one the delete
   * just left behind.
   */
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

  /**
   * Takes a sublocation out of the campaign — the same control on the same terms as `deleteLocation`
   * (see cc-sublocation-card), and only for a sublocation holding no cast card: a sublocation with
   * casts standing in it has to be emptied first, since those cards hang off it.
   */
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

  /**
   * Takes a cast out of the campaign — the card's own back-face delete control, whose dagger
   * asks before anything is written (see the card), and which is only drawn for a GM (see the
   * template). The row drops the card as soon as the write lands.
   */
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

  // Navigate to location detail
  goToLocationDetail(instanceId: string) {
    const location = this.locations().find(l => l.instanceId === instanceId);
    if (!location) return;

    const secrets: CampaignSecret[] = []; // Would need to fetch secrets from campaign
    this.drawerService.openLocationDetail({
      location,
      secrets,
      campaignId: this.internalCampaignId()
    });
  }

  // Navigate to sublocations for a specific location
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

  // Navigate to casts for a specific sublocation
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

  /**
   * Follows a card the travel drawer moved: the row shows the room the cast now stands in, with its
   * casts, and remembers that place as its own chosen location and sublocation — so going back from
   * there lists the sublocations of the location the cast is actually in, rather than the one it
   * came from.
   *
   * The drawer only says so as it shuts (see cc-cast-travel-picker), so the row the DM is looking
   * past does not shuffle about behind a drawer they are still moving cards in. The casts of that
   * room are read off this row's own collection, which the drawer has already asked to be re-read
   * as the cast landed (`publishCardsChanged`) — so a collection that has not caught up yet is not
   * refused: `refreshCardData` settles the middle row from whatever the row holds as its parent
   * sublocation, the moment that re-read lands.
   *
   * A row already moving the DM's own way keeps its move: a transition is a state change the row
   * makes once, and a follow-up arriving in the middle of one is not a second move.
   */
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

  /**
   * Opens the right drawer with the location picker: the library's own location cards to add to
   * the campaign, or the form for a brand new one (see the shell). It is what the ＋ at the end of
   * the locations row leads to — the row's own "New faction" tile, one row over.
   */
  openLocationPicker() {
    this.shellSvc.openLocationPickerDrawer(this.internalCampaignId());
  }

  /**
   * Opens the right drawer with the sublocation picker for a location: the library's own
   * sublocation cards to add under it, or the form for a brand new one (see the shell). It is
   * what both of the row's ＋ buttons lead to — the one standing in a location's empty third-row
   * slot, and the one at the end of the location's sublocations row.
   */
  openSublocationPicker(location: CampaignLocationInstance) {
    this.shellSvc.openSublocationPickerDrawer(
      this.internalCampaignId(), location.instanceId, location.name);
  }

  /**
   * Opens the right drawer with the cast picker for a sublocation: the library's own cast cards
   * to add into it, or the form for a brand new one (see the shell). The sublocation's parent
   * location instance travels with it, since the write needs both. It is what both of the row's
   * ＋ buttons lead to — the one standing in a sublocation's empty third-row slot, and the one at
   * the end of the sublocation's casts row.
   */
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

  // Navigate back to locations
  navigateToLocations() {
    this.beginTransition(() => {
      // Move locations back to middle row
      this.middleRowLocations.set(this.locations());
      this.middleRowSublocations.set([]);
      this.middleRowCasts.set([]);
      // Clear top row
      this.topRowCards.set([]);
      // Show all sublocation stacks in bottom row
      this.bottomRowCards.set(this.sublocations());
      // Update state
      this.parentLocation.set(null);
      this.parentSublocation.set(null);
      this.currentView.set('locations');
    });
  }

  // Navigate back to sublocations
  navigateToSublocationsFromCasts() {
    this.beginTransition(() => {
      // Get the parent location and all its sublocations
      const parentLoc = this.parentLocation();
      if (parentLoc) {
        this.middleRowSublocations.set(this.getSublocationsForLocation(parentLoc.instanceId));
      } else {
        this.middleRowSublocations.set(this.topRowSublocations());
      }

      this.middleRowCasts.set([]);
      // Keep parent location in top row
      this.topRowCards.set(this.locations());
      this.topRowSublocations.set([]);
      // Clear bottom row
      this.bottomRowCards.set([]);
      // Update state
      this.parentSublocation.set(null);
      this.currentView.set('sublocations');
    });
  }

  /**
   * Takes this row's cards away, then swaps them: every card fades where it stands, and only
   * once they have gone (or nearly, at `cardFadeWindowMs`) does `swap` put the new cards in, so
   * the cards arriving are laid out in a row the old ones have already left, and the Swiper
   * re-initialized just after counts only the new cards.
   *
   * `swap` is the state change the row would have made on the spot. A second click while the
   * cards are fading away is not a second move, and a viewer who has asked for less movement has
   * no fades to wait for: they are swapped straight away.
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

  /** The new cards going in, and the Swiper re-initialized once they are in the DOM. */
  private swapped(swap: () => void) {
    swap();

    // Re-initialize Swiper after DOM update
    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }
}
