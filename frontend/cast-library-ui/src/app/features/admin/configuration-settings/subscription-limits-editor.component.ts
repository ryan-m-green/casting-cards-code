import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SubscriptionLimitsDomain } from './configuration-settings.types';

@Component({
  selector: 'app-subscription-limits-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './subscription-limits-editor.component.html',
  styleUrl: './subscription-limits-editor.component.scss',
})
export class SubscriptionLimitsEditorComponent {
  config = input.required<SubscriptionLimitsDomain>();
  configChange = output<SubscriptionLimitsDomain>();

  updateFreeTrialField(field: keyof SubscriptionLimitsDomain['FreeTrial'], value: number) {
    const current = this.config();
    const updated = {
      ...current,
      FreeTrial: {
        ...current.FreeTrial,
        [field]: value,
      },
    };
    this.configChange.emit(updated);
  }

  updatePaidField(field: keyof SubscriptionLimitsDomain['Paid'], value: number) {
    const current = this.config();
    const updated = {
      ...current,
      Paid: {
        ...current.Paid,
        [field]: value,
      },
    };
    this.configChange.emit(updated);
  }
}
