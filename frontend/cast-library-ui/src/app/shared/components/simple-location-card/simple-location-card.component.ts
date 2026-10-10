import { Component, input } from '@angular/core';
import { Location, CampaignLocationInstance } from '../../models/location.model';
import { CcLocationIconComponent } from '../v2/cc-location-icon/cc-location-icon.component';

@Component({
  selector: 'app-simple-location-card',
  standalone: true,
  imports: [CcLocationIconComponent],
  templateUrl: './simple-location-card.component.html',
  styleUrl: './simple-location-card.component.scss'
})
export class SimpleLocationCardComponent {
  location = input.required<Location | CampaignLocationInstance>();
}