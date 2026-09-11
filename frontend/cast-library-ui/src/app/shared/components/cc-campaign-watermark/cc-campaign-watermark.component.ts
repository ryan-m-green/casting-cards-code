import { Component, input } from '@angular/core';

export type CcCampaignWatermarkType = 'party' | 'faction' | 'combined' | 'player' | 'hierarchy';

@Component({
  selector: 'app-cc-campaign-watermark',
  standalone: true,
  imports: [],
  templateUrl: './cc-campaign-watermark.component.html',
  styleUrl: './cc-campaign-watermark.component.scss'
})
export class CcCampaignWatermarkComponent {
  readonly type = input.required<CcCampaignWatermarkType>();
}
