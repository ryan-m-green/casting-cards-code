import { Component, input } from '@angular/core';

export type WatermarkPageType = 'cast' | 'sublocation' | 'location' | 'faction' | 'campaign';

@Component({
  selector: 'app-journal-watermark',
  standalone: true,
  imports: [],
  templateUrl: './journal-watermark.component.html',
  styleUrl: './journal-watermark.component.scss'
})
export class JournalWatermarkComponent {
  readonly pageType = input.required<WatermarkPageType>();
}
