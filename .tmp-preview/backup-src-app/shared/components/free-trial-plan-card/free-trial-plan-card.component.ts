import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionTier } from '../../../core/stripe.service';

@Component({
  selector: 'app-free-trial-plan-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './free-trial-plan-card.component.html',
  styleUrl: './free-trial-plan-card.component.scss'
})
export class FreeTrialPlanCardComponent {
  freeTrialLimits = input.required<SubscriptionTier | null>();
  loading = input.required<boolean>();
  startFreeTrial = input.required<() => void>();
  useNegativeMargin = input<boolean>(false);

  handleStartFreeTrial() {
    this.startFreeTrial()();
  }
}
