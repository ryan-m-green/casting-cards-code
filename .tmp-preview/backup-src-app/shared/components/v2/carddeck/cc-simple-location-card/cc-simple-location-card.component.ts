import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Location, CampaignLocationInstance } from '../../../../models/location.model';
import { CcLocationIconComponent } from '../../Shared/cc-location-icon/cc-location-icon.component';

@Component({
  selector: 'cc-simple-location-card',
  standalone: true,
  imports: [CcLocationIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-simple-location-card.component.html',
  styleUrl: './cc-simple-location-card.component.scss'
})
export class CcSimpleLocationCardComponent {
  location = input.required<Location | CampaignLocationInstance>();
}