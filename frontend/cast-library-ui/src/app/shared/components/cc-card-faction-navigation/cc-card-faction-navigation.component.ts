import { Component, inject, signal, AfterViewInit, ElementRef, ViewChild, Input, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FactionCardComponent } from '../faction-card/faction-card.component';
import { SimpleFactionCardComponent } from '../simple-faction-card/simple-faction-card.component';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { SimpleCastCardComponent } from '../simple-cast-card/simple-cast-card.component';
import { CampaignFactionInstance } from '../../models/faction.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CardInstanceUpdatedService } from '../../../core/hub/v2/card-instance-updated.service';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

/**
 * Hierarchical card navigation for campaign factions.
 *
 * Mirrors the layout/behaviour of `CcCardNavigationComponent` (locations ->
 * sublocations -> casts) but for the two-level faction hierarchy:
 *
 *   - Middle row : faction cards (active)
 *   - Bottom row : cast stacks that are members of the focused faction
 *   - Top row    : the parent faction breadcrumb while browsing its casts
 *
 * Cast children are resolved from the parent's `castInstanceIds` membership
 * list (primary cast first), unlike locations which derive children from a
 * foreign key on the child.
 */
@Component({
  selector: 'app-cc-card-faction-navigation',
  standalone: true,
  imports: [CommonModule, FactionCardComponent, SimpleFactionCardComponent, CastCardComponent, SimpleCastCardComponent],
  templateUrl: './cc-card-faction-navigation.component.html',
  styleUrl: './cc-card-faction-navigation.component.scss'
})
export class CcCardFactionNavigationComponent implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private cardInstanceUpdatedService = inject(CardInstanceUpdatedService);
  private hubSubscriptions: Subscription[] = [];

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
  factions = signal<CampaignFactionInstance[]>([]);
  casts = signal<CampaignCastInstance[]>([]);

  // Navigation state for the 2-level system
  currentView = signal<'factions' | 'casts'>('factions');
  parentFaction = signal<CampaignFactionInstance | null>(null);

  // Row states
  topRowFactions = signal<CampaignFactionInstance[]>([]);
  middleRowFactions = signal<CampaignFactionInstance[]>([]);
  middleRowCasts = signal<CampaignCastInstance[]>([]);

  // Faction tilt tracking
  private factionTilts = new Map<string, number>();

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
    // Destroy Swiper instance to prevent memory leaks
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    // Clean up hub subscriptions
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupHubSubscriptions() {
    // Subscribe to faction instance updates (re-fetch the faction list)
    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.factionInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    // Subscribe to cast instance updates
    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.castInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;

        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaign/${event.campaignId}/castinstances/${event.castInstanceId}`
        ).subscribe(updatedCast => {
          const apply = (list: CampaignCastInstance[]) =>
            list.map(c => c.instanceId === event.castInstanceId ? updatedCast : c);
          this.casts.update(apply);
          this.middleRowCasts.update(apply);
        });
      })
    );
  }

  // Re-fetch the faction list (there is no single-faction GET endpoint)
  private refreshFactions() {
    this.http.get<CampaignFactionInstance[]>(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions`
    ).subscribe(factions => {
      const merge = (list: CampaignFactionInstance[]) =>
        list.map(f => factions.find(n => n.factionInstanceId === f.factionInstanceId) ?? f);
      this.factions.set(factions);
      this.middleRowFactions.update(merge);
      this.topRowFactions.update(merge);
      this.parentFaction.update(p =>
        p ? (factions.find(n => n.factionInstanceId === p.factionInstanceId) ?? p) : p);
    });
  }

  private initializeSwiper() {
    if (!this.middleRow) {
      console.error('cc-card-faction-navigation - middleRow element not found');
      return;
    }

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
  }

  loadCardData() {
    if (!this.internalCampaignId()) {
      console.error('No campaign ID provided');
      this.error.set('No campaign ID provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Load faction and cast data in parallel
    Promise.all([
      this.http.get<CampaignFactionInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions`).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([factionsData, castsData]) => {
      this.factions.set(factionsData || []);
      this.casts.set(castsData || []);

      // Initialize row states
      this.middleRowFactions.set(factionsData || []);

      this.loading.set(false);

      // Initialize Swiper after data is loaded and DOM is rendered
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    }).catch(err => {
      console.error('Error loading faction data:', err);
      this.error.set('Failed to load faction data. Please try again.');
      this.loading.set(false);
    });
  }

  /**
   * Cast members of a faction, primary cast first. Membership is expressed as
   * an id list on the faction (`castInstanceIds`) rather than a foreign key on
   * the child, so we resolve against the campaign cast collection.
   */
  getCastsForFaction(faction: CampaignFactionInstance): CampaignCastInstance[] {
    const ids = faction.castInstanceIds ?? [];
    const orderedIds = [
      ...(faction.primaryCastInstanceId ? [faction.primaryCastInstanceId] : []),
      ...ids.filter(id => id !== faction.primaryCastInstanceId),
    ];

    const casts = this.casts();
    return orderedIds
      .map(id => casts.find(c => c.instanceId === id))
      .filter((c): c is CampaignCastInstance => !!c);
  }

  // Helper method for Math.abs() to use in templates
  abs(value: number): number {
    return Math.abs(value);
  }

  // Faction tilt for visual variation
  factionTilt(instanceId: string): number {
    if (!this.factionTilts.has(instanceId)) {
      const magnitude = 2;
      this.factionTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.factionTilts.get(instanceId)!;
  }

  // Cast tilt for visual variation
  castTilt(instanceId: string): number {
    if (!this.castTilts.has(instanceId)) {
      this.castTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.castTilts.get(instanceId)!;
  }

  // Toggle faction visibility
  toggleFactionVisibility(faction: CampaignFactionInstance) {
    const next = !faction.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions/${faction.factionInstanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      const apply = (list: CampaignFactionInstance[]) =>
        list.map(f => f.factionInstanceId === faction.factionInstanceId ? { ...f, isVisibleToPlayers: next } : f);
      this.factions.update(apply);
      this.middleRowFactions.update(apply);
      this.topRowFactions.update(apply);
      this.parentFaction.update(p =>
        p && p.factionInstanceId === faction.factionInstanceId ? { ...p, isVisibleToPlayers: next } : p);
    });
  }

  // Toggle cast visibility
  toggleCastVisibility(cast: CampaignCastInstance) {
    const next = !cast.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances/${cast.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      const apply = (list: CampaignCastInstance[]) =>
        list.map(c => c.instanceId === cast.instanceId ? { ...c, isVisibleToPlayers: next } : c);
      this.casts.update(apply);
      this.middleRowCasts.update(apply);
    });
  }

  // Navigate to casts for a specific faction
  navigateToCasts(faction: CampaignFactionInstance) {
    const casts = this.getCastsForFaction(faction);

    if (casts.length > 0) {
      this.topRowFactions.set([faction]);
      this.middleRowFactions.set([]);
      this.middleRowCasts.set(casts);
      this.parentFaction.set(faction);
      this.currentView.set('casts');

      // Re-initialize Swiper after DOM update
      setTimeout(() => {
        this.initializeSwiper();
      }, 50);
    }
  }

  // Navigate back to factions
  navigateToFactions() {
    // Move factions back to middle row
    this.middleRowFactions.set(this.factions());
    this.middleRowCasts.set([]);
    // Clear top row
    this.topRowFactions.set([]);
    // Update state
    this.parentFaction.set(null);
    this.currentView.set('factions');

    // Re-initialize Swiper after DOM update
    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }
}
