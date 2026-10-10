import { Component, inject, OnInit, OnDestroy, signal, viewChild, TemplateRef } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PortalTransitionService } from './core/portal-transition.service';
import { AuthService } from './core/auth/auth.service';
import { RightDrawerComponent } from './shared/components/right-drawer/right-drawer.component';
import { SubscriptionContentComponent } from './shared/components/right-drawer/subscription-content.component';
import { SubscriptionDrawerService } from './core/subscription-drawer.service';
import { DrawerService, DrawerConfig, DrawerContentType } from './core/drawer.service';
import { CampaignShellService } from './core/campaign-shell.service';
import type { PurchaseResult } from './shared/models/shop-purchase.model';
import { ShopPurchaseContentComponent } from './shared/components/right-drawer/shop-purchase-content.component';
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
    LocationDetailContentComponent,
    SublocationDetailContentComponent,
    CastDetailContentComponent,
    FactionDetailContentComponent
  ],
  template: `
    <div class="portal-transition-overlay" [class.active]="transition.active()" [class.instant]="transition.instant()" [class.no-fade]="transition.noFade()"></div>
    <router-outlet />
    
    <!-- Templates for drawer content -->
    <ng-template #subscriptionContentTemplate let-context>
      <app-subscription-content
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <!--
      The shop's purchase panel: raised by a shop's own item — the player's way in (see
      sublocation-detail-content). It stands in this drawer, replacing whatever the drawer was
      holding, and the drawer stays open behind the receipt its answer raises (see
      onShopPurchaseComplete).
    -->
    <ng-template #shopPurchaseContentTemplate let-context>
      <app-shop-purchase-content
        [portalColor]="context?.portalColor"
        [campaignId]="context?.campaignId || ''"
        [sublocationInstanceId]="context?.sublocationInstanceId || ''"
        [item]="context?.item"
        (purchaseComplete)="onShopPurchaseComplete($event)"
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
        [isDm]="context?.isDm ?? true"
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <!-- RightDrawerComponent at screen level -->
    <app-right-drawer #rightDrawer
      [portalColor]="drawerPortalColor"
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

      /* Taken off at once, for a page doing its own reveal: no fade of its own to sit
         under the reveal and keep darkening the page while it runs. */
      &.no-fade {
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
  private shell = inject(CampaignShellService);
  private _navSub: Subscription | null = null;
  private _drawerSub?: Subscription;
  private _genericDrawerSub?: Subscription;

  rightDrawer = viewChild<RightDrawerComponent>('rightDrawer');
  subscriptionContentTemplate = viewChild<TemplateRef<any>>('subscriptionContentTemplate');
  shopPurchaseContentTemplate = viewChild<TemplateRef<any>>('shopPurchaseContentTemplate');
  locationDetailContentTemplate = viewChild<TemplateRef<any>>('locationDetailContentTemplate');
  sublocationDetailContentTemplate = viewChild<TemplateRef<any>>('sublocationDetailContentTemplate');
  castDetailContentTemplate = viewChild<TemplateRef<any>>('castDetailContentTemplate');
  factionDetailContentTemplate = viewChild<TemplateRef<any>>('factionDetailContentTemplate');
  
  drawerTitle = signal('');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);
  currentOnOpen = signal<(() => Promise<void> | void) | null>(null);
  currentOnClose = signal<(() => Promise<void> | void) | null>(null);

  /**
   * The colour the app's own drawer wears: the campaign's own, taken from the shell on the page.
   *
   * The drawer stands beside `<router-outlet>`, not inside the shell, so it cannot inherit
   * `--portal-color` from the shell the way the panels that live on the board do — it has to be
   * handed the colour here. Left to itself it wears the default purple, whatever the campaign.
   */
  get drawerPortalColor(): string {
    const campaign = this.shell.campaign();
    const spineColor = campaign?.spineColor;

    return spineColor && /^#[0-9a-fA-F]{6}$/.test(spineColor) ? spineColor : '#6e28d0';
  }

  private currentDrawer: DrawerConfig | null = null;
  private shelfBehindPurchase: DrawerConfig | null = null;

  private static readonly RECEIPT_AFTER_SHELF_MS = 420;

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

  /**
   * The shop's answer to a purchase, as the write lands. The shelf the purchase panel displaced is
   * put back up first — the drawer never moves, only what it holds — and the answer is handed to the
   * campaign shell a beat later, which raises the receipt over the shop that is standing again (see
   * the shell's `purchaseReceipt`). The v1 shells' purchase flows raise theirs themselves.
   */
  onShopPurchaseComplete(result: PurchaseResult) {
    const shelf = this.shelfBehindPurchase;
    this.shelfBehindPurchase = null;

    if (!shelf || !this.showDrawerContent(shelf)) {
      this.shell.shopPurchaseComplete.next(result);
      return;
    }

    setTimeout(
      () => this.shell.shopPurchaseComplete.next(result),
      App.RECEIPT_AFTER_SHELF_MS
    );
  }

  openDrawer(config: DrawerConfig) {
    const drawer = this.rightDrawer();
    if (!drawer) {
      return;
    }

    const displaced = this.currentDrawer;
    if (!this.showDrawerContent(config)) {
      return;
    }

    this.shelfBehindPurchase = config.contentType === 'shop-purchase' ? displaced : null;

    drawer.open();
  }

  private showDrawerContent(config: DrawerConfig): boolean {
    const template = this.templateFor(config.contentType);
    if (!template) {
      console.error(`Template not found for content type: ${config.contentType}`);
      return false;
    }

    this.currentDrawer = config;
    this.drawerTitle.set(config.title || '');
    this.currentContentTemplate.set(template);
    this.currentContentContext.set({ $implicit: config.context || {} });
    this.currentOnOpen.set(config.onOpen || null);
    this.currentOnClose.set(config.onClose || null);

    return true;
  }

  private templateFor(contentType: DrawerContentType): TemplateRef<any> | null {
    switch (contentType) {
      case 'subscription':
        return this.subscriptionContentTemplate() ?? null;
      case 'shop-purchase':
        return this.shopPurchaseContentTemplate() ?? null;
      case 'location-detail':
        return this.locationDetailContentTemplate() ?? null;
      case 'sublocation-detail':
        return this.sublocationDetailContentTemplate() ?? null;
      case 'cast-detail':
        return this.castDetailContentTemplate() ?? null;
      case 'faction-detail':
        return this.factionDetailContentTemplate() ?? null;
    }

    return null;
  }
}
