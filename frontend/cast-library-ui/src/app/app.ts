import { Component, inject, OnInit, OnDestroy, signal, viewChild, TemplateRef } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PortalAnimationService } from './core/portal-animation.service';
import { AuthService } from './core/auth/auth.service';
import { RightDrawerComponent } from './shared/components/Shared/right-drawer/right-drawer.component';
import { SubscriptionContentComponent } from './shared/components/Shared/right-drawer/subscription-content.component';
import { SubscriptionDrawerService } from './core/subscription-drawer.service';
import { DrawerService, DrawerConfig, DrawerContentType } from './core/drawer.service';
import { CampaignShellService } from './core/campaign-shell.service';
import type { PurchaseResult } from './shared/models/shop-purchase.model';
import { ShopPurchaseContentComponent } from './shared/components/Shared/right-drawer/shop-purchase-content.component';
import { LocationDetailContentComponent } from './shared/components/Shared/right-drawer/location-detail-content.component';
import { SublocationDetailContentComponent } from './shared/components/Shared/right-drawer/sublocation-detail-content.component';
import { CastDetailContentComponent } from './shared/components/Shared/right-drawer/cast-detail-content.component';
import { FactionDetailContentComponent } from './shared/components/Shared/right-drawer/faction-detail-content.component';

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
    <div class="portal-transition-overlay" [class.active]="portal.active()" [class.instant]="portal.instant()" [class.no-fade]="portal.noFade()"></div>
    <router-outlet />
    
    <ng-template #subscriptionContentTemplate let-context>
      <app-subscription-content
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

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

      &.no-fade {
        transition: none;
      }
    }
  `]
})
export class App implements OnInit, OnDestroy {
  portal = inject(PortalAnimationService);
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

  get drawerPortalColor(): string {
    const campaign = this.shell.campaign();
    const spineColor = campaign?.spineColor;

    return spineColor && /^#[0-9a-fA-F]{6}$/.test(spineColor) ? spineColor : '#6e28d0';
  }

  private currentDrawer: DrawerConfig | null = null;
  private shelfBehindPurchase: DrawerConfig | null = null;

  private static readonly RECEIPT_AFTER_SHELF_MS = 420;

  ngOnInit() {
    this._drawerSub = this.subscriptionDrawerService.open$.subscribe(() => {
      this.openSubscriptionDrawer();
    });

    this._genericDrawerSub = this.drawerService.open$.subscribe((config: DrawerConfig) => {
      this.openDrawer(config);
    });

    this.checkForStripeReturn();

    const hasCookie = this.hasJwtCookie();
    const hasLocalStorageToken = this.hasLocalStorageToken();
    
    if (hasCookie || hasLocalStorageToken) {
      
      this.authService.refreshCurrentUser().subscribe({
        next: () => {
          if (this.authService.isLoggedIn()) {
            this.authService.getCsrfToken().subscribe({
              error: () => {
              }
            });
          }
        },
        error: (error) => {
          if (this.authService.isLoggedIn()) {
            this.authService.getCsrfToken().subscribe({
              error: () => {
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
      if (this.portal.active()) this.portal.hide();
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
    
    if (stripeSuccess === 'true' && sessionId) {
      this.authService.startSubscriptionRefresh();
      
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
