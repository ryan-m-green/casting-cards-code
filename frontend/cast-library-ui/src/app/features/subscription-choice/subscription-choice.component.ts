import { Component, inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StripeService, PricingDisplayResponse, SubscriptionTier } from '../../core/stripe.service';
import { SubscriptionService } from '../../core/subscription.service';
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
  private subscriptionService = inject(SubscriptionService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  pricingData = toSignal(this.stripe.getPricingDisplay(), { initialValue: undefined });
  isCheckoutSuccess = signal(false);
  private checkInterval: any = null;

  get freeTrialLimits(): SubscriptionTier | null {
    return this.pricingData()?.subscriptionLimits?.freeTrial ?? null;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['checkout'] === 'success') {
        this.isCheckoutSuccess.set(true);
        this.startPollingSubscriptionStatus();
      }
    });
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.subscriptionService.stopPolling();
  }

  private startPollingSubscriptionStatus() {
    this.subscriptionService.startPolling();
    
    const checkInterval = setInterval(() => {
      const sub = this.subscriptionService.subscription();
      const lockLevel = this.subscriptionService.lockLevel();
      
      if (sub?.status === 'Active' && lockLevel === 'FullAccess') {
        clearInterval(checkInterval);
        this.subscriptionService.stopPolling();
        this.isCheckoutSuccess.set(false);
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
      console.error('No active pricing model available');
      return;
    }

    this.loading = true;
    this.stripe.createCheckoutSession().subscribe({
      next: (response) => {
        window.location.href = response.checkoutUrl;
      },
      error: (error) => {
        console.error('Failed to create checkout session:', error);
        this.loading = false;
      }
    });
  }
}
