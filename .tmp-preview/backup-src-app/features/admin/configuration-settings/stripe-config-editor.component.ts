import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StripeConfigurationDomain } from './configuration-settings.types';

@Component({
  selector: 'app-stripe-config-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './stripe-config-editor.component.html',
  styleUrl: './stripe-config-editor.component.scss',
})
export class StripeConfigEditorComponent {
  config = input.required<StripeConfigurationDomain>();
  configChange = output<StripeConfigurationDomain>();

  showSecretKey = { test: false, live: false };

  setActiveAccount(account: 'test' | 'live') {
    const current = this.config();
    const updated = {
      ...current,
      activeAccount: account,
    };
    this.configChange.emit(updated);
  }

  updateTestAccountField(field: keyof StripeConfigurationDomain['testAccount'], value: string) {
    const current = this.config();
    const updated = {
      ...current,
      testAccount: {
        ...current.testAccount,
        [field]: value,
      },
    };
    this.configChange.emit(updated);
  }

  updateLiveAccountField(field: keyof StripeConfigurationDomain['liveAccount'], value: string) {
    const current = this.config();
    const updated = {
      ...current,
      liveAccount: {
        ...current.liveAccount,
        [field]: value,
      },
    };
    this.configChange.emit(updated);
  }

  toggleSecretKeyVisibility(account: 'test' | 'live') {
    this.showSecretKey[account] = !this.showSecretKey[account];
  }
}
