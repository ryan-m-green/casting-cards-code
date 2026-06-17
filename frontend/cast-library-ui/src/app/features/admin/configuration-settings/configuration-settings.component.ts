import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';

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
  imports: [FormsModule, JournalTitleComponent],
  templateUrl: './configuration-settings.component.html',
  styleUrl: './configuration-settings.component.scss',
})
export class ConfigurationSettingsComponent implements OnInit {
  private http = inject(HttpClient);

  configurations = signal<ConfigurationDto[]>([]);
  pricingModels = signal<PricingModel[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  newKey = '';
  newValue = '';
  showAddForm = signal(false);

  regularConfigurations = computed(() => 
    this.configurations().filter(c => c.key !== 'pricing_model')
  );

  ngOnInit() {
    this.loadConfigurations();
  }

  loadConfigurations() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.get<ConfigurationDto[]>(`${environment.apiUrl}/api/site-configuration`)
      .subscribe({
        next: (res) => {
          this.configurations.set(res);
          const pricingModelConfig = res.find(c => c.key === 'pricing_model');
          if (pricingModelConfig) {
            try {
              this.pricingModels.set(JSON.parse(pricingModelConfig.value));
            } catch (e) {
              console.error('Failed to parse pricing models:', e);
              this.pricingModels.set([]);
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

  toggleAddForm() {
    this.showAddForm.update(v => !v);
    this.newKey = '';
    this.newValue = '';
  }

  addConfiguration() {
    if (!this.newKey || !this.newValue) return;

    const newConfig: ConfigurationDto = {
      id: '00000000-0000-0000-0000-000000000000',
      key: this.newKey,
      value: this.newValue,
    };

    this.configurations.update(configs => [...configs, newConfig]);
    this.newKey = '';
    this.newValue = '';
    this.showAddForm.set(false);
  }

  updateConfiguration(index: number, value: string) {
    this.configurations.update(configs => {
      const updated = [...configs];
      updated[index] = { ...updated[index], value };
      return updated;
    });
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

    const pricingModelConfig: ConfigurationDto = {
      id: '00000000-0000-0000-0000-000000000000',
      key: 'pricing_model',
      value: JSON.stringify(this.pricingModels()),
    };

    const allConfigurations = [...this.regularConfigurations(), pricingModelConfig];

    this.http.put(`${environment.apiUrl}/api/site-configuration`, allConfigurations)
      .subscribe({
        next: () => {
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
