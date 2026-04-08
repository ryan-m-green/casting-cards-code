import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../../../shared/models/location.model';

@Component({
  selector: 'app-location-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-player-card.component.html',
  styleUrl: './location-player-card.component.scss'
})
export class LocationPlayerCardComponent {
  location = input.required<CampaignLocationInstance>();

  initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
