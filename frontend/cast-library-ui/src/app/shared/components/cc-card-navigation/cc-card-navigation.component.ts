import { Component, inject, signal, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, Input } from '@angular/core';
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

@Component({
  selector: 'app-cc-card-navigation',
  standalone: true,
  imports: [CommonModule, LocationCardComponent, SublocationCardComponent, SimpleLocationCardComponent, SimpleSublocationCardComponent, CastCardComponent, SimpleCastCardComponent],
  templateUrl: './cc-card-navigation.component.html',
  styleUrl: './cc-card-navigation.component.scss'
})
export class CcCardNavigationComponent implements AfterViewInit {
  private http = inject(HttpClient);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChildren('dropSpots') dropSpots!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('topRowCard') topRowCard!: ElementRef<HTMLElement>;

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

  // Animation states
  isAnimating = signal<boolean>(false);
  
  // Animation tracking
  animatingStackId = signal<string | null>(null);
  isTransitioningFromBottom = signal<boolean>(false);
  
  // Track parent card index for positioning
  parentLocationIndex = signal<number>(0);
  parentSublocationIndex = signal<number>(0);

  // Drag state
  isDown = false;
  startX = 0;
  scrollLeft = 0;
  hasMoved = false; // Track if there was actual movement

  // Momentum scrolling
  velocity = 0;
  lastX = 0;
  lastTime = 0;
  animationFrameId: number | null = null;
  
  constructor() {
    // Campaign ID is provided via input
  }

  ngAfterViewInit() {
    console.log('CcCardNavigationComponent - campaignId from input:', this.campaignId);

    // Set internal campaign ID from input
    this.internalCampaignId.set(this.campaignId);

    // Load card data
    this.loadCardData();
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

  // Navigate to sublocations for a specific location
  navigateToSublocations(location: CampaignLocationInstance) {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.animatingStackId.set(location.instanceId);
    this.isTransitioningFromBottom.set(true);

    const sublocations = this.getSublocationsForLocation(location.instanceId);

    if (sublocations.length > 0) {
      // Get all location card elements from middle row
      const locationCards = document.querySelectorAll('.middle-row-card');
      const ghosts: HTMLElement[] = [];
      
      // Find the index of the clicked location in the locations array
      const clickedLocationIndex = this.locations().findIndex(loc => loc.instanceId === location.instanceId);
      const clickedCard = locationCards[clickedLocationIndex] as HTMLElement;
      
      // Set parent index for top row positioning
      this.parentLocationIndex.set(clickedLocationIndex);
      
      if (!clickedCard) {
        console.error('Clicked card not found');
        this.isAnimating.set(false);
        this.animatingStackId.set(null);
        this.isTransitioningFromBottom.set(false);
        return;
      }
      
      const clickedRect = clickedCard.getBoundingClientRect();

      // Capture the drop spot rects so each ghost can target its aligned drop zone
      const cardRects = this.dropSpots.toArray().map(d => d.nativeElement.getBoundingClientRect());

      // Create ghost elements for each location card and hide originals
      locationCards.forEach((card: Element, index: number) => {
        const rect = card.getBoundingClientRect();
        const ghost = card.cloneNode(true) as HTMLElement;
        
        Object.assign(ghost.style, {
          position: 'fixed',
          top: rect.top + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          margin: '0',
          zIndex: String(10 + index), // Initial z-index based on position
          pointerEvents: 'none',
          opacity: '1',
          transition: 'none',
          willChange: 'transform, opacity',
        });
        
        // Hide original card
        (card as HTMLElement).style.opacity = '0';
        
        document.body.appendChild(ghost);
        ghosts.push(ghost);
      });

      // Phase 1: Stack Cards Under Clicked Parent (0ms - 2500ms)
      const phase1Animations = ghosts.map((ghost: HTMLElement, index: number) => {
        let targetX, targetY, targetScale;
        
        if (index === clickedLocationIndex) {
          // Keep the clicked card in place
          targetX = 0;
          targetY = 0;
          targetScale = 1;
          // Set highest z-index for clicked card
          setTimeout(() => { ghost.style.zIndex = '100'; }, 10);
        } else {
          // Slide other cards underneath the clicked card
          targetX = clickedRect.left - parseFloat(ghost.style.left);
          targetY = clickedRect.top - parseFloat(ghost.style.top);
          targetScale = 0.8;
          // Set lower z-index for stacked cards
          setTimeout(() => { ghost.style.zIndex = String(50 - Math.abs(index - clickedLocationIndex)); }, 10);
        }
        const rect = cardRects[index];
        return ghost.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${targetX}px, ${targetY}px) scale(${targetScale})`, opacity: 1 }
        ], {
          duration: 2500,
          easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
          fill: 'forwards'
        });
      });

      // Phase 1 Completion - Step 5: Hide all original 2nd row cards, Step 6: Hide all ghosts except top
      Promise.all(phase1Animations.map((a: Animation) => a.finished)).then(() => {
        // Step 5: Hide all original 2nd row cards
        locationCards.forEach((card: Element) => {
          (card as HTMLElement).style.opacity = '0';
        });
        
        // Step 6: Hide all ghost cards except the top one
        ghosts.forEach((ghost: HTMLElement, index: number) => {
          if (index !== clickedLocationIndex) {
            ghost.style.opacity = '0';
          }
        });
        
        // Phase 2: Move top ghost to correct drop spot in 1st row
        const dropSpotElements = this.dropSpots.toArray();
        const targetDropSpot = dropSpotElements[clickedLocationIndex];
        
        // Hide top row card initially
        if (this.topRowCard) {
          this.topRowCard.nativeElement.style.opacity = '0';
        }
        
        let phase2Animation: Animation;
        
        if (targetDropSpot) {
          const dropSpotRect = targetDropSpot.nativeElement.getBoundingClientRect();
          const targetX = dropSpotRect.left - clickedRect.left;
          const targetY = dropSpotRect.top - clickedRect.top;
          
          phase2Animation = ghosts[clickedLocationIndex].animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${targetX}px, ${targetY}px) scale(0.5)`, opacity: 1 }
          ], {
            duration: 2500,
            easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
            fill: 'forwards'
          });
          
          // After animation, position original card at drop spot and show it
          phase2Animation.finished.then(() => {
            if (this.topRowCard && targetDropSpot) {
              const topRowCardRect = this.topRowCard.nativeElement.getBoundingClientRect();
              this.topRowCard.nativeElement.style.position = 'fixed';
              this.topRowCard.nativeElement.style.left = dropSpotRect.left + 'px';
              this.topRowCard.nativeElement.style.top = dropSpotRect.top + 'px';
              this.topRowCard.nativeElement.style.opacity = '1';
              this.topRowCard.nativeElement.style.zIndex = '1';
            }
          });
        } else {
          // Fallback: just move vertically if drop spots not available
          phase2Animation = ghosts[clickedLocationIndex].animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: 'translate(0, -160px) scale(0.5)', opacity: 1 }
          ], {
            duration: 2500,
            easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
            fill: 'forwards'
          });
        }

        // Remove stacked ghosts immediately
        ghosts.forEach((ghost: HTMLElement, index: number) => {
          if (index !== clickedLocationIndex) {
            ghost.remove();
          }
        });

        // After phase 2 completes
        phase2Animation.finished.then(() => {
          // Step 5: Hide the ghost card
          ghosts[clickedLocationIndex].style.opacity = '0';
          
          // Remove all ghosts
          ghosts.forEach(g => g.remove());

          // Update state - Move location to top row, but don't move bottom row to middle row yet
          this.topRowCards.set([location]);
          this.middleRowLocations.set([]);
          this.parentLocation.set(location);
          // Commented out: Don't move 3rd row to 2nd row yet
          // this.middleRowSublocations.set(sublocations);
          // this.middleRowCasts.set([]);
          // this.bottomRowCards.set([]);
          // this.parentSublocation.set(null);
          // this.currentView.set('sublocations');

          // Reset animation states
          this.animatingStackId.set(null);
          this.isTransitioningFromBottom.set(false);
          this.isAnimating.set(false);
        });
      });
    } else {
      this.isAnimating.set(false);
      this.animatingStackId.set(null);
      this.isTransitioningFromBottom.set(false);
    }
  }

  // Navigate to casts for a specific sublocation
  navigateToCasts(sublocation: CampaignSublocationInstance) {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.animatingStackId.set(sublocation.instanceId);
    this.isTransitioningFromBottom.set(true);

    const casts = this.getCastsForSublocation(sublocation.instanceId);

    if (casts.length > 0) {
      // Find the index of the sublocation in middle row
      const clickedSublocationIndex = this.middleRowSublocations().findIndex(sub => sub.instanceId === sublocation.instanceId);
      
      // Set parent index for top row positioning
      this.parentSublocationIndex.set(clickedSublocationIndex >= 0 ? clickedSublocationIndex : 0);
      
      // Get all sublocation card elements
      const sublocationCards = document.querySelectorAll('.middle-row-card');
      const ghosts: HTMLElement[] = [];

      // Create ghost elements for each sublocation card and hide originals immediately
      sublocationCards.forEach((card: Element) => {
        const rect = card.getBoundingClientRect();
        const ghost = card.cloneNode(true) as HTMLElement;
        
        Object.assign(ghost.style, {
          position: 'fixed',
          top: rect.top + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          margin: '0',
          zIndex: '1000',
          pointerEvents: 'none',
          opacity: '1',
          transition: 'none',
          willChange: 'transform, opacity',
        });
        
        // Hide original card immediately
        (card as HTMLElement).style.opacity = '0';
        
        document.body.appendChild(ghost);
        ghosts.push(ghost);
      });

      // Animate ghosts up and shrink
      const animations = ghosts.map((ghost: HTMLElement) => {
        return ghost.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: 'translate(0, -160px) scale(0.5)', opacity: 0.7 }
        ], {
          duration: 5000,
          easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
          fill: 'forwards'
        });
      });

      // After sublocation animation, update row states
      Promise.all(animations.map((a: Animation) => a.finished)).then(() => {
        // Move only the parent sublocation to top row
        this.topRowSublocations.set([sublocation]);
        this.topRowCards.set([]);
        // Move casts to middle row
        this.middleRowCasts.set(casts);
        this.middleRowSublocations.set([]);
        // Clear bottom row
        this.bottomRowCards.set([]);
        // Update state
        this.parentSublocation.set(sublocation);
        this.currentView.set('casts');

          // Remove ghosts
          ghosts.forEach(g => g.remove());

          // Reset animation states
          this.animatingStackId.set(null);
          this.isTransitioningFromBottom.set(false);
          this.isAnimating.set(false);
        });
    } else {
      this.isAnimating.set(false);
      this.animatingStackId.set(null);
      this.isTransitioningFromBottom.set(false);
    }
  }

  // Navigate back to locations
  navigateToLocations() {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);

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

    setTimeout(() => {
      this.isAnimating.set(false);
    }, 500);
  }

  // Navigate back to sublocations
  navigateToSublocationsFromCasts() {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);

    // Move sublocations back to middle row
    this.middleRowSublocations.set(this.topRowSublocations());
    this.middleRowCasts.set([]);
    // Keep parent location in top row
    this.topRowCards.set(this.locations());
    this.topRowSublocations.set([]);
    // Clear bottom row
    this.bottomRowCards.set([]);
    // Update state
    this.parentSublocation.set(null);
    this.currentView.set('sublocations');

    setTimeout(() => {
      this.isAnimating.set(false);
    }, 500);
  }

  // Mouse events
  onMouseDown(e: MouseEvent) {
    this.isDown = true;
    this.hasMoved = false;
    this.startX = e.pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;
    this.lastX = this.startX;
    this.lastTime = performance.now();
    this.velocity = 0;

    // Disable smooth scroll during drag for better responsiveness
    this.scrollContainer.nativeElement.style.scrollBehavior = 'auto';

    // Cancel any ongoing momentum animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  onMouseLeave() {
    this.isDown = false;
    if (Math.abs(this.velocity) < 0.1) {
      this.scrollContainer.nativeElement.style.scrollBehavior = 'smooth';
    }
    this.startMomentum();
  }

  onMouseUp() {
    this.isDown = false;
    if (Math.abs(this.velocity) < 0.1) {
      this.scrollContainer.nativeElement.style.scrollBehavior = 'smooth';
    }
    this.startMomentum();
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isDown) return;

    const x = e.pageX - this.scrollContainer.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 2; // Scroll multiplier

    // Only prevent default and scroll if there's actual movement
    if (Math.abs(walk) > 1) {
      this.hasMoved = true;
      e.preventDefault();

      // Calculate velocity for momentum
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime > 0) {
        this.velocity = (x - this.lastX) / deltaTime;
        this.lastX = x;
        this.lastTime = currentTime;
      }

      this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
    }
  }

  // Touch events
  onTouchStart(e: TouchEvent) {
    this.isDown = true;
    this.hasMoved = false;
    this.startX = e.touches[0].pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;
    this.lastX = this.startX;
    this.lastTime = performance.now();
    this.velocity = 0;

    // Disable smooth scroll during drag for better responsiveness
    this.scrollContainer.nativeElement.style.scrollBehavior = 'auto';

    // Cancel any ongoing momentum animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  onTouchEnd() {
    this.isDown = false;
    if (Math.abs(this.velocity) < 0.1) {
      this.scrollContainer.nativeElement.style.scrollBehavior = 'smooth';
    }
    this.startMomentum();
  }

  onTouchMove(e: TouchEvent) {
    if (!this.isDown) return;

    const x = e.touches[0].pageX - this.scrollContainer.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 2; // Scroll multiplier

    // Only scroll if there's actual movement
    if (Math.abs(walk) > 1) {
      this.hasMoved = true;

      // Calculate velocity for momentum
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime > 0) {
        this.velocity = (x - this.lastX) / deltaTime;
        this.lastX = x;
        this.lastTime = currentTime;
      }

      this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
    }
  }

  // Momentum scrolling
  startMomentum() {
    if (Math.abs(this.velocity) < 0.1) return;

    const animate = () => {
      this.velocity *= 0.95; // Friction

      if (Math.abs(this.velocity) < 0.1) {
        this.animationFrameId = null;
        return;
      }

      this.scrollContainer.nativeElement.scrollLeft += this.velocity * 10;
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }
}