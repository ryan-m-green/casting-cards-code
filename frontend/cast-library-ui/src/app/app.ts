import { Component, inject, OnInit, OnDestroy, signal, viewChild, TemplateRef } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PortalTransitionService } from './core/portal-transition.service';
import { AuthService } from './core/auth/auth.service';
import { RightDrawerComponent } from './shared/components/right-drawer/right-drawer.component';
import { SubscriptionContentComponent } from './shared/components/right-drawer/subscription-content.component';
import { SubscriptionDrawerService } from './core/subscription-drawer.service';
import { DrawerService, DrawerConfig } from './core/drawer.service';
import { ShopPurchaseContentComponent } from './shared/components/right-drawer/shop-purchase-content.component';
import { PlayerSecretsContentComponent } from './shared/components/right-drawer/player-secrets-content.component';
import { PlayerInventoryContentComponent } from './shared/components/right-drawer/player-inventory-content.component';
import { PartyGoldContentComponent } from './shared/components/right-drawer/party-gold-content.component';
import { ChronicleContentComponent } from './shared/components/right-drawer/chronicle-content.component';
import { SoundtrackContentComponent } from './shared/components/right-drawer/soundtrack-content.component';
import { LocationDetailContentComponent } from './shared/components/right-drawer/location-detail-content.component';
import { SublocationDetailContentComponent } from './shared/components/right-drawer/sublocation-detail-content.component';
import { CastDetailContentComponent } from './shared/components/right-drawer/cast-detail-content.component';
import { FactionDetailContentComponent } from './shared/components/right-drawer/faction-detail-content.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RightDrawerComponent,
    SubscriptionContentComponent,
    ShopPurchaseContentComponent,
    PlayerSecretsContentComponent,
    PlayerInventoryContentComponent,
    PartyGoldContentComponent,
    ChronicleContentComponent,
    SoundtrackContentComponent,
    LocationDetailContentComponent,
    SublocationDetailContentComponent,
    CastDetailContentComponent,
    FactionDetailContentComponent
  ],
  template: `
    <div class="portal-transition-overlay" [class.active]="transition.active()" [class.instant]="transition.instant()"></div>
    <router-outlet />
    
    <!-- Templates for drawer content -->
    <ng-template #subscriptionContentTemplate let-context>
      <app-subscription-content
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #shopPurchaseContentTemplate let-context>
      <app-shop-purchase-content
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #playerSecretsContentTemplate let-context>
      <app-player-secrets-content
        [portalColor]="context?.portalColor"
        [mode]="context?.mode || 'player'"
        [member]="context?.member"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #playerInventoryContentTemplate let-context>
      <app-player-inventory-content
        [portalColor]="context?.portalColor"
        [campaignId]="context?.campaignId || ''"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #partyGoldContentTemplate let-context>
      <app-party-gold-content
        [campaignId]="context?.campaignId || ''"
        [portalColor]="context?.portalColor"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #chronicleContentTemplate let-context>
      <app-chronicle-content
        [portalColor]="context?.portalColor"
        [isDmMode]="context?.isDmMode || false"
        [campaignId]="context?.campaignId || ''"
        [initialSearchQuery]="context?.initialSearchQuery || ''"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #soundtrackContentTemplate let-context>
      <app-soundtrack-content
        [campaignId]="context?.campaignId || ''"
        [portalColor]="context?.portalColor"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #locationDetailContentTemplate let-context>
      <app-location-detail-content
        [location]="context?.location"
        [secrets]="context?.secrets || []"
        [campaignId]="context?.campaignId || ''"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #sublocationDetailContentTemplate let-context>
      <app-sublocation-detail-content
        [sublocation]="context?.sublocation"
        [secrets]="context?.secrets || []"
        [campaignId]="context?.campaignId"
        [sublocationInstanceId]="context?.sublocationInstanceId"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #castDetailContentTemplate let-context>
      <app-cast-detail-content
        [cast]="context?.cast"
        [secrets]="context?.secrets || []"
        [campaignId]="context?.campaignId"
        [castInstanceId]="context?.castInstanceId"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <ng-template #factionDetailContentTemplate let-context>
      <app-faction-detail-content
        [faction]="context?.faction"
        [campaignId]="context?.campaignId || ''"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <!-- RightDrawerComponent at screen level -->
    <app-right-drawer #rightDrawer
      [title]="drawerTitle()"
      [contentTemplate]="currentContentTemplate()"
      [contentContext]="currentContentContext()"
      [onOpen]="currentOnOpen()"
      [onClose]="currentOnClose()"
    />
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .portal-transition-overlay {
      position: fixed;
      inset: 0;
      background: #000;
      opacity: 0;
      pointer-events: none;
      z-index: 8000;
      transition: opacity 3000ms ease;

      &.active {
        opacity: 1;
        pointer-events: all;
      }

      &.instant {
        opacity: 1;
        pointer-events: all;
        transition: none;
      }
    }
  `]
})
export class App implements OnInit, OnDestroy {
  transition = inject(PortalTransitionService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private subscriptionDrawerService = inject(SubscriptionDrawerService);
  private drawerService = inject(DrawerService);
  private _navSub: Subscription | null = null;
  private _drawerSub?: Subscription;
  private _genericDrawerSub?: Subscription;

  rightDrawer = viewChild<RightDrawerComponent>('rightDrawer');
  subscriptionContentTemplate = viewChild<TemplateRef<any>>('subscriptionContentTemplate');
  shopPurchaseContentTemplate = viewChild<TemplateRef<any>>('shopPurchaseContentTemplate');
  playerSecretsContentTemplate = viewChild<TemplateRef<any>>('playerSecretsContentTemplate');
  playerInventoryContentTemplate = viewChild<TemplateRef<any>>('playerInventoryContentTemplate');
  partyGoldContentTemplate = viewChild<TemplateRef<any>>('partyGoldContentTemplate');
  chronicleContentTemplate = viewChild<TemplateRef<any>>('chronicleContentTemplate');
  soundtrackContentTemplate = viewChild<TemplateRef<any>>('soundtrackContentTemplate');
  locationDetailContentTemplate = viewChild<TemplateRef<any>>('locationDetailContentTemplate');
  sublocationDetailContentTemplate = viewChild<TemplateRef<any>>('sublocationDetailContentTemplate');
  castDetailContentTemplate = viewChild<TemplateRef<any>>('castDetailContentTemplate');
  factionDetailContentTemplate = viewChild<TemplateRef<any>>('factionDetailContentTemplate');
  
  drawerTitle = signal('');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);
  currentOnOpen = signal<(() => Promise<void> | void) | null>(null);
  currentOnClose = signal<(() => Promise<void> | void) | null>(null);

  ngOnInit() {
    // Listen for subscription drawer open requests (legacy support)
    this._drawerSub = this.subscriptionDrawerService.open$.subscribe(() => {
      this.openSubscriptionDrawer();
    });

    // Listen for generic drawer open requests
    this._genericDrawerSub = this.drawerService.open$.subscribe((config: DrawerConfig) => {
      this.openDrawer(config);
    });

    // Check if returning from Stripe checkout and start subscription refresh interval
    this.checkForStripeReturn();

    // Check if there's evidence of an existing session (JWT cookie or localStorage token)
    const hasCookie = this.hasJwtCookie();
    const hasLocalStorageToken = this.hasLocalStorageToken();
    
    if (hasCookie || hasLocalStorageToken) {
      
      // Validate session on app startup to check auth state
      this.authService.refreshCurrentUser().subscribe({
        next: () => {
          // If user is authenticated, fetch CSRF token
          if (this.authService.isLoggedIn()) {
            this.authService.getCsrfToken().subscribe({
              error: () => {
                // Silently fail - CSRF token will be fetched on first request
              }
            });
          }
        },
        error: (error) => {
          // Check if user is still authenticated from localStorage restoration
          // The refreshCurrentUser method now handles 401s by clearing auth state itself
          if (this.authService.isLoggedIn()) {
            this.authService.getCsrfToken().subscribe({
              error: () => {
                // Silently fail - CSRF token will be fetched on first request
              }
            });
          } else {
          }
        }
      });
    } else {
    }

    this._navSub = this.router.events.pipe(
      filter(e => e instanceof NavigationCancel || e instanceof NavigationError)
    ).subscribe(() => {
      if (this.transition.active()) this.transition.hide();
    });
  }

  private hasJwtCookie(): boolean {
    return document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith('casting_cards_token=')
    );
  }

  private hasLocalStorageToken(): boolean {
    return !!localStorage.getItem('cast_library_token');
  }

  private checkForStripeReturn(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const sessionId = urlParams.get('session_id');
    
    // Check if returning from Stripe checkout
    if (stripeSuccess === 'true' && sessionId) {
      this.authService.startSubscriptionRefresh();
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe_success');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.toString());
    }
  }

  ngOnDestroy() {
    this._navSub?.unsubscribe();
    if (this._drawerSub) {
      this._drawerSub.unsubscribe();
    }
    if (this._genericDrawerSub) {
      this._genericDrawerSub.unsubscribe();
    }
  }

  openSubscriptionDrawer() {
    this.openDrawer({
      contentType: 'subscription',
      title: 'Upgrade Your Plan',
      context: {}
    });
  }

  openDrawer(config: DrawerConfig) {
    const drawer = this.rightDrawer();
    if (!drawer) {
      return;
    }

    // Get the appropriate template based on content type
    let template: TemplateRef<any> | null = null;
    switch (config.contentType) {
      case 'subscription':
        template = this.subscriptionContentTemplate() ?? null;
        break;
      case 'shop-purchase':
        template = this.shopPurchaseContentTemplate() ?? null;
        break;
      case 'player-secrets':
        template = this.playerSecretsContentTemplate() ?? null;
        break;
      case 'player-inventory':
        template = this.playerInventoryContentTemplate() ?? null;
        break;
      case 'party-gold':
        template = this.partyGoldContentTemplate() ?? null;
        break;
      case 'chronicle':
        template = this.chronicleContentTemplate() ?? null;
        break;
      case 'soundtrack':
        template = this.soundtrackContentTemplate() ?? null;
        break;
      case 'location-detail':
        template = this.locationDetailContentTemplate() ?? null;
        break;
      case 'sublocation-detail':
        template = this.sublocationDetailContentTemplate() ?? null;
        break;
      case 'cast-detail':
        template = this.castDetailContentTemplate() ?? null;
        break;
      case 'faction-detail':
        template = this.factionDetailContentTemplate() ?? null;
        break;
    }

    if (!template) {
      console.error(`Template not found for content type: ${config.contentType}`);
      return;
    }

    // Set drawer configuration
    this.drawerTitle.set(config.title || '');
    this.currentContentTemplate.set(template);
    this.currentContentContext.set({ $implicit: config.context || {} });
    this.currentOnOpen.set(config.onOpen || null);
    this.currentOnClose.set(config.onClose || null);

    // Open the drawer
    drawer.open();
  }
}
