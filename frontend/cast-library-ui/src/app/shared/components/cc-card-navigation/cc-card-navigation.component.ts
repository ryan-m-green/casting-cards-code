import { Component, inject, signal, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, Input, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { LocationCardComponent } from '../location-card/location-card.component';
import { SublocationCardComponent } from '../sublocation-card/sublocation-card.component';
import { SimpleLocationCardComponent } from '../simple-location-card/simple-location-card.component';
import { SimpleSublocationCardComponent } from '../simple-sublocation-card/simple-sublocation-card.component';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { SimpleCastCardComponent } from '../simple-cast-card/simple-cast-card.component';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignSecret } from '../../models/secret.model';
import { DrawerService } from '../../../core/drawer.service';
import { CardInstanceUpdatedService } from '../../../core/hub/v2/card-instance-updated.service';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

@Component({
  selector: 'app-cc-card-navigation',
  standalone: true,
  imports: [CommonModule, LocationCardComponent, SublocationCardComponent, SimpleLocationCardComponent, SimpleSublocationCardComponent, CastCardComponent, SimpleCastCardComponent],
  templateUrl: './cc-card-navigation.component.html',
  styleUrl: './cc-card-navigation.component.scss'
})
export class CcCardNavigationComponent implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private drawerService = inject(DrawerService);
  private cardInstanceUpdatedService = inject(CardInstanceUpdatedService);
  private hubSubscriptions: Subscription[] = [];

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

  // Track parent card index for positioning
  parentLocationIndex = signal<number>(0);
  parentSublocationIndex = signal<number>(0);

  // Location tilt tracking
  private locationTilts = new Map<string, number>();

  // Sublocation tilt tracking
  private sublocationTilts = new Map<string, number>();

  // Cast tilt tracking
  private castTilts = new Map<string, number>();

  ngAfterViewInit() {
    console.log('CcCardNavigationComponent - campaignId from input:', this.campaignId);

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
    console.log('CcCardNavigationComponent - setting up hub subscriptions');
    // Subscribe to location instance updates
    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.locationInstanceUpdated$.subscribe(event => {
        console.log('CcCardNavigationComponent - locationInstanceUpdated$ received:', event);
        console.log('CcCardNavigationComponent - internalCampaignId:', this.internalCampaignId());
        if (!event || event.campaignId !== this.internalCampaignId()) {
          console.log('CcCardNavigationComponent - event ignored: campaignId mismatch or no event');
          return;
        }

        // Fetch updated location data
        console.log('CcCardNavigationComponent - fetching updated location data');
        this.http.get<CampaignLocationInstance>(
          `${environment.apiUrl}/api/campaign/${event.campaignId}/locationinstances/${event.locationInstanceId}`
        ).subscribe(updatedLocation => {
          console.log('CcCardNavigationComponent - updated location received:', updatedLocation);
          this.locations.update(locs =>
            locs.map(l => l.instanceId === event.locationInstanceId ? updatedLocation : l)
          );
          this.middleRowLocations.update(locs =>
            locs.map(l => l.instanceId === event.locationInstanceId ? updatedLocation : l)
          );
          this.topRowCards.update(locs =>
            locs.map(l => l.instanceId === event.locationInstanceId ? updatedLocation : l)
          );
          console.log('CcCardNavigationComponent - location signals updated');
        });
      })
    );

    // Subscribe to sublocation instance updates
    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.sublocationInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;

        // Fetch updated sublocation data
        this.http.get<CampaignSublocationInstance>(
          `${environment.apiUrl}/api/campaign/${event.campaignId}/sublocationinstances/${event.sublocationInstanceId}`
        ).subscribe(updatedSublocation => {
          this.sublocations.update(subs =>
            subs.map(s => s.instanceId === event.sublocationInstanceId ? updatedSublocation : s)
          );
          this.middleRowSublocations.update(subs =>
            subs.map(s => s.instanceId === event.sublocationInstanceId ? updatedSublocation : s)
          );
          this.bottomRowCards.update(subs =>
            subs.map(s => s.instanceId === event.sublocationInstanceId ? updatedSublocation : s)
          );
          this.topRowSublocations.update(subs =>
            subs.map(s => s.instanceId === event.sublocationInstanceId ? updatedSublocation : s)
          );
        });
      })
    );

    // Subscribe to cast instance updates
    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.castInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;

        // Fetch updated cast data
        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaign/${event.campaignId}/castinstances/${event.castInstanceId}`
        ).subscribe(updatedCast => {
          this.casts.update(casts =>
            casts.map(c => c.instanceId === event.castInstanceId ? updatedCast : c)
          );
          this.middleRowCasts.update(casts =>
            casts.map(c => c.instanceId === event.castInstanceId ? updatedCast : c)
          );
        });
      })
    );
  }

  private initializeSwiper() {
    if (this.middleRow) {
      console.log('Initializing Swiper on middleRow', this.middleRow.nativeElement);

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

      console.log('Swiper initialized successfully', this.swiper);
    } else {
      console.error('middleRow element not found');
    }
  }
  
  loadCardData() {
    console.log('loadCardData called, campaignId:', this.internalCampaignId());

    if (!this.internalCampaignId()) {
      console.error('No campaign ID provided');
      this.error.set('No campaign ID provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    console.log('Loading location, sublocation, and cast data for campaign:', this.internalCampaignId());

    // Load location, sublocation, and cast data in parallel
    Promise.all([
      this.http.get<CampaignLocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/locationinstances`).toPromise(),
      this.http.get<CampaignSublocationInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/sublocationinstances`).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([locationsData, sublocationsData, castsData]) => {
      console.log('API response - locations:', locationsData?.length, 'sublocations:', sublocationsData?.length, 'casts:', castsData?.length);
      this.locations.set(locationsData || []);
      this.sublocations.set(sublocationsData || []);
      this.casts.set(castsData || []);

      // Initialize row states
      this.middleRowLocations.set(locationsData || []);
      this.bottomRowCards.set(sublocationsData || []);

      this.loading.set(false);

      // Initialize Swiper after data is loaded and DOM is rendered
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    }).catch(err => {
      console.error('Error loading card data:', err);
      this.error.set('Failed to load location data. Please try again.');
      this.loading.set(false);
    });
  }

  // Get sublocations for a specific location
  getSublocationsForLocation(locationId: string): CampaignSublocationInstance[] {
    return this.sublocations().filter(sub => sub.locationInstanceId === locationId);
  }

  // Get casts for a specific sublocation
  getCastsForSublocation(sublocationId: string): CampaignCastInstance[] {
    return this.casts().filter(cast => cast.sublocationInstanceId === sublocationId);
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

  // Navigate to sublocation detail
  goToSublocation(subLoc: CampaignSublocationInstance) {
    console.log('Navigate to sublocation detail:', subLoc.instanceId);
    // TODO: Implement navigation to sublocation detail
  }

  // Navigate to cast detail
  goToCast(cast: CampaignCastInstance) {
    console.log('Navigate to cast detail:', cast.instanceId);
    // TODO: Implement navigation to cast detail
  }

  // Navigate to sublocations for a specific location
  navigateToSublocations(location: CampaignLocationInstance) {
    const sublocations = this.getSublocationsForLocation(location.instanceId);

    if (sublocations.length > 0) {
      this.topRowCards.set([location]);
      this.middleRowLocations.set([]);
      this.middleRowSublocations.set(sublocations);
      this.middleRowCasts.set([]);
      this.bottomRowCards.set([]);
      this.parentLocation.set(location);
      this.parentSublocation.set(null);
      this.currentView.set('sublocations');

      // Re-initialize Swiper after DOM update
      setTimeout(() => {
        this.initializeSwiper();
      }, 50);
    }
  }

  // Navigate to casts for a specific sublocation
  navigateToCasts(sublocation: CampaignSublocationInstance) {
    const casts = this.getCastsForSublocation(sublocation.instanceId);

    if (casts.length > 0) {
      this.topRowSublocations.set([sublocation]);
      this.topRowCards.set([]);
      this.middleRowCasts.set(casts);
      this.middleRowSublocations.set([]);
      this.bottomRowCards.set([]);
      this.parentSublocation.set(sublocation);
      this.currentView.set('casts');

      // Re-initialize Swiper after DOM update
      setTimeout(() => {
        this.initializeSwiper();
      }, 50);
    }
  }

  // Navigate back to locations
  navigateToLocations() {
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

    // Re-initialize Swiper after DOM update
    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }

  // Navigate back to sublocations
  navigateToSublocationsFromCasts() {
    // Get the parent location and all its sublocations
    const parentLoc = this.parentLocation();
    if (parentLoc) {
      const allSublocations = this.getSublocationsForLocation(parentLoc.instanceId);
      this.middleRowSublocations.set(allSublocations);
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

    // Re-initialize Swiper after DOM update
    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }
}
