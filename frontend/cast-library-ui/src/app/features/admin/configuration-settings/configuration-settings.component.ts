import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { SubscriptionLimitsEditorComponent } from './subscription-limits-editor.component';
import { StopWordsEditorComponent } from './stop-words-editor.component';
import { StripeConfigEditorComponent } from './stripe-config-editor.component';
import {
  SubscriptionLimitsDomain,
  StopWordsDomain,
  StripeConfigurationDomain,
} from './configuration-settings.types';

interface ConfigurationDto {
  id: string;
  key: string;
  value: string;
}

interface PricingModel {
  id: string;
  modelName: string;
  priceInCents: number;
  stripePriceId: string;
  isActive: boolean;
}

@Component({
  selector: 'app-configuration-settings',
  standalone: true,
  imports: [
    FormsModule,
    JournalTitleComponent,
    SubscriptionLimitsEditorComponent,
    StopWordsEditorComponent,
    StripeConfigEditorComponent,
  ],
  templateUrl: './configuration-settings.component.html',
  styleUrl: './configuration-settings.component.scss',
})
export class ConfigurationSettingsComponent implements OnInit {
  private http = inject(HttpClient);

  configurations = signal<ConfigurationDto[]>([]);
  pricingModels = signal<PricingModel[]>([]);
  subscriptionLimits = signal<SubscriptionLimitsDomain | null>(null);
  stopWords = signal<StopWordsDomain | null>(null);
  stripeConfig = signal<StripeConfigurationDomain | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  // Store entity IDs for each configuration type
  pricingModelId = signal<string | null>(null);
  subscriptionLimitsId = signal<string | null>(null);
  stopWordsId = signal<string | null>(null);
  stripeConfigId = signal<string | null>(null);

  
  ngOnInit() {
    this.loadConfigurations();
  }

  loadConfigurations() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.get<ConfigurationDto[]>(`${environment.apiUrl}/api/site-configuration`)
      .subscribe({
        next: (res) => {
          console.log('Loaded configurations:', res);
          this.configurations.set(res);
          const pricingModelConfig = res.find(c => c.key === 'pricing_model');
          if (pricingModelConfig) {
            this.pricingModelId.set(pricingModelConfig.id);
            try {
              this.pricingModels.set(JSON.parse(pricingModelConfig.value));
            } catch (e) {
              console.error('Failed to parse pricing models:', e);
              this.pricingModels.set([]);
            }
          }

          const subscriptionLimitsConfig = res.find(c => c.key === 'subscription_limits');
          if (subscriptionLimitsConfig) {
            this.subscriptionLimitsId.set(subscriptionLimitsConfig.id);
            try {
              this.subscriptionLimits.set(JSON.parse(subscriptionLimitsConfig.value));
            } catch (e) {
              console.error('Failed to parse subscription limits:', e);
            }
          }

          const stopWordsConfig = res.find(c => c.key === 'stop_words');
          if (stopWordsConfig) {
            this.stopWordsId.set(stopWordsConfig.id);
            try {
              this.stopWords.set(JSON.parse(stopWordsConfig.value));
            } catch (e) {
              console.error('Failed to parse stop words:', e);
            }
          }

          const stripeConfigConfig = res.find(c => c.key === 'stripe_configuration');
          if (stripeConfigConfig) {
            this.stripeConfigId.set(stripeConfigConfig.id);
            console.log('Stripe config raw JSON:', stripeConfigConfig.value);
            try {
              const parsed = JSON.parse(stripeConfigConfig.value);
              console.log('Stripe config parsed:', parsed);
              this.stripeConfig.set(parsed);
            } catch (e) {
              console.error('Failed to parse stripe configuration:', e);
            }
          }

          this.loading.set(false);
        },
        error: () => {
          this.errorMsg.set('Failed to load configuration.');
          this.loading.set(false);
        },
      });
  }

  
  updateSubscriptionLimits(config: SubscriptionLimitsDomain) {
    this.subscriptionLimits.set(config);
  }

  updateStopWords(config: StopWordsDomain) {
    this.stopWords.set(config);
  }

  updateStripeConfig(config: StripeConfigurationDomain) {
    console.log('Stripe config updated:', config);
    this.stripeConfig.set(config);
  }

  setActivePricingModel(modelName: string) {
    this.pricingModels.update(models => 
      models.map(m => ({ ...m, isActive: m.modelName === modelName }))
    );
  }

  updatePricingModelPrice(id: string, priceInDollars: number) {
    const priceInCents = Math.round(priceInDollars * 100);
    this.pricingModels.update(models => 
      models.map(m => m.id === id ? { ...m, priceInCents } : m)
    );
  }

  saveConfigurations() {
    this.saving.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    const allConfigurations: ConfigurationDto[] = [];

    if (this.pricingModels().length > 0) {
      allConfigurations.push({
        id: this.pricingModelId() || '00000000-0000-0000-0000-000000000000',
        key: 'pricing_model',
        value: JSON.stringify(this.pricingModels()),
      });
    }

    if (this.subscriptionLimits()) {
      allConfigurations.push({
        id: this.subscriptionLimitsId() || '00000000-0000-0000-0000-000000000000',
        key: 'subscription_limits',
        value: JSON.stringify(this.subscriptionLimits()),
      });
    }

    if (this.stopWords()) {
      allConfigurations.push({
        id: this.stopWordsId() || '00000000-0000-0000-0000-000000000000',
        key: 'stop_words',
        value: JSON.stringify(this.stopWords()),
      });
    }

    if (this.stripeConfig()) {
      console.log('Saving Stripe config:', this.stripeConfig());
      console.log('Stripe config ID:', this.stripeConfigId());
      const stripeConfigJson = JSON.stringify(this.stripeConfig());
      console.log('Stripe config JSON:', stripeConfigJson);
      allConfigurations.push({
        id: this.stripeConfigId() || '00000000-0000-0000-0000-000000000000',
        key: 'stripe_configuration',
        value: stripeConfigJson,
      });
    }

    console.log('Stored IDs:', {
      pricingModelId: this.pricingModelId(),
      subscriptionLimitsId: this.subscriptionLimitsId(),
      stopWordsId: this.stopWordsId(),
      stripeConfigId: this.stripeConfigId()
    });
    console.log('Complete API request payload:', allConfigurations);
    this.http.put(`${environment.apiUrl}/api/site-configuration`, allConfigurations)
      .subscribe({
        next: () => {
          console.log('API request successful');
          this.successMsg.set('Configuration updated successfully.');
          this.saving.set(false);
          this.loadConfigurations();
          setTimeout(() => this.successMsg.set(''), 3000);
        },
        error: (e) => {
          console.error('Save error:', e);
          console.error('Error message:', e.error?.message);
          console.error('Error object:', e.error);
          console.error('Validation errors:', e.error?.errors);
          this.errorMsg.set(e.error?.errors ? JSON.stringify(e.error.errors) : (e.error?.message || JSON.stringify(e.error) || 'Failed to save configuration.'));
          this.saving.set(false);
          setTimeout(() => this.errorMsg.set(''), 3000);
        },
      });
  }
}
