import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService, PricingDisplayResponse, SubscriptionTier } from '../../../core/stripe.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PremiumPlanCardComponent } from '../premium-plan-card/premium-plan-card.component';
import { FreeTrialPlanCardComponent } from '../free-trial-plan-card/free-trial-plan-card.component';

@Component({
  selector: 'app-subscription-content',
  standalone: true,
  imports: [CommonModule, PremiumPlanCardComponent, FreeTrialPlanCardComponent],
  templateUrl: './subscription-content.component.html',
  styleUrl: './subscription-content.component.scss'
})
export class SubscriptionContentComponent {
  private stripe = inject(StripeService);
  private authService = inject(AuthService);

  closeDrawer = output<void>();

  loading = signal(false);
  pricingData = signal<PricingDisplayResponse | null>(null);
  isButtonDisabled = computed(() => this.loading() || !this.pricingData()?.active);

  get freeTrialLimits(): SubscriptionTier | null {
    return this.pricingData()?.subscriptionLimits?.freeTrial ?? null;
  }

  ngOnInit() {
    // Only fetch pricing data if user is authenticated to avoid 401 errors
    if (this.authService.isLoggedIn()) {
      this.stripe.getPricingDisplay().subscribe({
        next: (data) => {
          this.pricingData.set(data);
        },
        error: () => {
          this.pricingData.set(null);
        }
      });
    }
  }

  subscribeNow() {
    if (!this.pricingData()?.active) {
      return;
    }

    this.loading.set(true);
    this.stripe.createCheckoutSession().subscribe({
      next: (response) => {
        window.location.href = response.checkoutUrl;
      },
      error: (error) => {
        this.loading.set(false);
      }
    });
  }

  startFreeTrial() {
    this.loading.set(true);
    this.stripe.createFreeTrialSubscription().subscribe({
      next: () => {
        this.closeDrawer.emit();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
