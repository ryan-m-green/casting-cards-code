import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { StripeService } from '../../../core/stripe.service';
import { FlipAnimationService } from '../../../core/flip-animation.service';

@Component({
  selector: 'app-subscription-lock-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-lock-banner.component.html',
  styleUrl: './subscription-lock-banner.component.scss'
})
export class SubscriptionLockBannerComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private stripe = inject(StripeService);
  private flipAnimationService = inject(FlipAnimationService);

  readonly lockLevel = this.auth.lockLevel;
  readonly isExempt = this.auth.isExempt;
  readonly isDm = this.auth.isDm;
  readonly isFreeTrial = this.auth.isFreeTrial;
  readonly isFlipInProgress = this.flipAnimationService.isFlipInProgress;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly excludedPaths = ['/about', '/legal', '/change-password', '/dm/change-password', '/dm/bug-report', '/player/bug-report', '/subscription-choice'];

  private initialFlipComplete = signal(false);
  private wasOnCover = this.router.url === '/' || this.router.url === '';

  constructor() {
    console.log('[SubscriptionLockBanner] Component instantiated');
    // If we started on the cover page, wait longer for the flip animation
    const delay = this.wasOnCover ? 1200 : 1000;
    setTimeout(() => {
      console.log('[SubscriptionLockBanner] Initial flip complete');
      this.initialFlipComplete.set(true);
    }, delay);
  }

  readonly shouldShow = computed(() => {
    if (!this.initialFlipComplete()) return false;
    if (this.isFlipInProgress()) return false;
    const url = this.currentUrl();
    // Never show on cover page
    if (url === '/' || url === '') return false;
    if (this.excludedPaths.some(path => url.startsWith(path))) return false;
    if (!this.auth.isLoggedIn()) return false;
    // Don't show until subscription data is loaded
    if (!this.auth.subscription()) return false;
    if (this.isExempt()) return false;
    if (this.isFreeTrial()) return false;
    const level = this.lockLevel();
    if (level === 'FullAccess') {
      const pastDueSince = this.auth.subscription()?.pastDueSince;
      if (!pastDueSince) return false;
      return new Date() > new Date(pastDueSince);
    }
    return true;
  });

  readonly isGate = computed(() => {
    const level = this.lockLevel();
    return level === 'Suspended' || level === 'HardLock';
  });

  readonly bannerMessage = computed(() => {
    const level = this.lockLevel();
    switch (level) {
      case 'FullAccess':
        return 'Payment issue — retrying automatically';
      case 'SoftLock':
        return 'Your subscription is past due. Editing is temporarily disabled.';
      case 'HardLock':
        return 'Your account is locked until payment is updated.';
      case 'Suspended':
        return 'Your subscription has been suspended. Update your payment method to restore access.';
      default:
        return '';
    }
  });

  readonly bannerClass = computed(() => {
    const level = this.lockLevel();
    return `banner-${level.toLowerCase()}`;
  });

  async updatePayment(): Promise<void> {
    try {
      await this.stripe.redirectToCustomerPortal();
    } catch (error) {
    }
  }
}
