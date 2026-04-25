import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../../../shared/models/location.model';
import { CampaignSecret } from '../../../../shared/models/secret.model';
import { LockIconComponent } from '../../../../shared/components/lock-icon/lock-icon.component';

@Component({
  selector: 'app-location-detail-panel',
  standalone: true,
  imports: [CommonModule, LockIconComponent],
  templateUrl: './location-detail-panel.component.html',
  styleUrl: './location-detail-panel.component.scss'
})
export class LocationDetailPanelComponent {
  location    = input.required<CampaignLocationInstance>();
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
