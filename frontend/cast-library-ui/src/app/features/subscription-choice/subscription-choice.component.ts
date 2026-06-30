import { Component, inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StripeService, PricingDisplayResponse, SubscriptionTier } from '../../core/stripe.service';
import { AuthService } from '../../core/auth/auth.service';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';
import { PremiumPlanCardComponent } from '../../shared/components/premium-plan-card/premium-plan-card.component';
import { FreeTrialPlanCardComponent } from '../../shared/components/free-trial-plan-card/free-trial-plan-card.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';

@Component({
  selector: 'app-subscription-choice',
  standalone: true,
  imports: [CommonModule, JournalTitleComponent, PremiumPlanCardComponent, FreeTrialPlanCardComponent],
  templateUrl: './subscription-choice.component.html',
  styleUrl: './subscription-choice.component.scss'
})
export class SubscriptionChoiceComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private stripe = inject(StripeService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  pricingData = toSignal(this.stripe.getPricingDisplay(), { initialValue: undefined });
  isCheckoutSuccessSignal = signal(false);
  private checkInterval: any = null;

  get freeTrialLimits(): SubscriptionTier | null {
    return this.pricingData()?.subscriptionLimits?.freeTrial ?? null;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['checkout'] === 'success') {
        // Cookies handle authentication automatically, no token check needed
        this.isCheckoutSuccessSignal.set(true);
        this.startSubscriptionRefresh();
      }
    });
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.authService.stopSubscriptionRefresh();
  }

  private startSubscriptionRefresh() {
    this.authService.startSubscriptionRefresh();
    
    const checkInterval = setInterval(() => {
      const sub = this.authService.subscription();
      const lockLevel = this.authService.lockLevel();
      
      if (sub?.status === 'Active' && lockLevel === 'FullAccess') {
        clearInterval(checkInterval);
        this.authService.stopSubscriptionRefresh();
        this.isCheckoutSuccessSignal.set(false);
        this.router.navigate(['/dm/dashboard']);
      }
    }, 3000);
  }

  startFreeTrial() {
    this.loading = true;
    this.stripe.createFreeTrialSubscription().subscribe({
      next: () => {
        this.router.navigate(['/dm/dashboard']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  subscribeNow() {
    if (!this.pricingData()?.active) {
      return;
    }

    this.loading = true;
    this.stripe.createCheckoutSession().subscribe({
      next: (response) => {
        window.location.href = response.checkoutUrl;
      },
      error: (error) => {
        this.loading = false;
      }
    });
  }

  isCheckoutSuccess(): boolean {
    return this.isCheckoutSuccessSignal();
  }
}
