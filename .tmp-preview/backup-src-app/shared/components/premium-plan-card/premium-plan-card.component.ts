import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingDisplayResponse } from '../../../core/stripe.service';

@Component({
  selector: 'app-premium-plan-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './premium-plan-card.component.html',
  styleUrl: './premium-plan-card.component.scss'
})
export class PremiumPlanCardComponent {
  pricingData = input.required<PricingDisplayResponse | null>();
  loading = input.required<boolean>();
  subscribe = input.required<() => void>();
  useNegativeMargin = input<boolean>(false);

  handleSubscribe() {
    this.subscribe()();
  }
}
