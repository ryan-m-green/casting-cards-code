import { Component, inject, OnInit, OnDestroy, signal, viewChild, TemplateRef } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PortalTransitionService } from './core/portal-transition.service';
import { AuthService } from './core/auth/auth.service';
import { RightDrawerComponent } from './shared/components/right-drawer/right-drawer.component';
import { SubscriptionContentComponent } from './shared/components/right-drawer/subscription-content.component';
import { SubscriptionDrawerService } from './core/subscription-drawer.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RightDrawerComponent, SubscriptionContentComponent],
  template: `
    <div class="portal-transition-overlay" [class.active]="transition.active()" [class.instant]="transition.instant()"></div>
    <router-outlet />
    
    <!-- Templates for drawer content -->
    <ng-template #subscriptionContentTemplate>
      <app-subscription-content
        (closeDrawer)="rightDrawer.close()"
      />
    </ng-template>

    <!-- RightDrawerComponent at screen level -->
    <app-right-drawer #rightDrawer
      [title]="drawerTitle()"
      [contentTemplate]="currentContentTemplate()"
      [contentContext]="currentContentContext()"
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
  private _navSub: Subscription | null = null;
  private _drawerSub?: Subscription;

  rightDrawer = viewChild<RightDrawerComponent>('rightDrawer');
  subscriptionContentTemplate = viewChild<TemplateRef<any>>('subscriptionContentTemplate');
  drawerTitle = signal('Upgrade Your Plan');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);

  ngOnInit() {
    // Listen for subscription drawer open requests
    this._drawerSub = this.subscriptionDrawerService.open$.subscribe(() => {
      this.openSubscriptionDrawer();
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
  }

  openSubscriptionDrawer() {
    const drawer = this.rightDrawer();
    const template = this.subscriptionContentTemplate();
    
    if (!drawer || !template) {
      return;
    }
    
    this.drawerTitle.set('Upgrade Your Plan');
    this.currentContentTemplate.set(template);
    this.currentContentContext.set({});
    drawer.open();
  }
}
