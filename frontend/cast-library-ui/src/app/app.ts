import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PortalTransitionService } from './core/portal-transition.service';
import { AuthService } from './core/auth/auth.service';
import { SubscriptionDrawerComponent } from './shared/components/subscription-drawer/subscription-drawer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SubscriptionDrawerComponent],
  template: `
    <div class="portal-transition-overlay" [class.active]="transition.active()" [class.instant]="transition.instant()"></div>
    <router-outlet />
    <app-subscription-drawer />
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
  private _navSub: Subscription | null = null;

  ngOnInit() {
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
  }
}
