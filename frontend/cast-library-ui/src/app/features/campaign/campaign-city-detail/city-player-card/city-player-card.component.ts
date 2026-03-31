import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignCityInstance } from '../../../../shared/models/city.model';

@Component({
  selector: 'app-city-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './city-player-card.component.html',
  styleUrl: './city-player-card.component.scss'
})
export class CityPlayerCardComponent {
  city = input.required<CampaignCityInstance>();

  initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
