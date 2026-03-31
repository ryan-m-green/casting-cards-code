import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignCityInstance } from '../../../../shared/models/city.model';
import { CampaignSecret } from '../../../../shared/models/secret.model';

@Component({
  selector: 'app-city-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './city-detail-panel.component.html',
  styleUrl: './city-detail-panel.component.scss'
})
export class CityDetailPanelComponent {
  city    = input.required<CampaignCityInstance>();
  secrets = input.required<CampaignSecret[]>();

  revealSecret = output<CampaignSecret>();
  resealSecret = output<CampaignSecret>();

  onRevealSecret(secret: CampaignSecret): void {
    this.revealSecret.emit(secret);
  }

  onResealSecret(secret: CampaignSecret): void {
    this.resealSecret.emit(secret);
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }
}
