import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService, PricingDisplayResponse, SubscriptionTier } from '../../../core/stripe.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PremiumPlanCardComponent } from '../premium-plan-card/premium-plan-card.component';
import { FreeTrialPlanCardComponent } from '../free-trial-plan-card/free-trial-plan-card.component';

@Component({
  selector: 'app-subscription-drawer',
  standalone: true,
  imports: [CommonModule, PremiumPlanCardComponent, FreeTrialPlanCardComponent],
  templateUrl: './subscription-drawer.component.html',
  styleUrl: './subscription-drawer.component.scss'
})
export class SubscriptionDrawerComponent {
  private stripe = inject(StripeService);
  private drawerService = inject(SubscriptionDrawerService);
  private authService = inject(AuthService);

  isOpen = this.drawerService.isOpen;
  isClosing = signal(false);
  loading = signal(false);
  pricingData: PricingDisplayResponse | null = null;
  isButtonDisabled = computed(() => this.loading() || !this.pricingData?.active);

  get freeTrialLimits(): SubscriptionTier | null {
    return this.pricingData?.subscriptionLimits?.freeTrial ?? null;
  }

  ngOnInit() {
    // Only fetch pricing data if user is authenticated to avoid 401 errors
    if (this.authService.isLoggedIn()) {
      this.stripe.getPricingDisplay().subscribe({
        next: (data) => {
          this.pricingData = data;
        },
        error: () => {
          this.pricingData = null;
        }
      });
    }
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.drawerService.close();
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  subscribeNow() {
    if (!this.pricingData?.active) {
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
        this.close();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
