import { Component, input } from '@angular/core';

@Component({
  selector: 'app-v2-campaign-placeholder',
  standalone: true,
  template: `
    <div class="v2-placeholder">
      <p class="area-name">{{ areaName() }}</p>
      <p>V2 Campaign Shell - Middle Middle</p>
      <p>Black background with pulsing border active</p>
    </div>
  `,
  styleUrl: './v2-campaign-placeholder.component.scss'
})
export class V2CampaignPlaceholderComponent {
  areaName = input.required<string>();
}