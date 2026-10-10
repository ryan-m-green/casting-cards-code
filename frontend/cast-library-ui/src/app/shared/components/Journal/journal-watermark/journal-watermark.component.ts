import { Component, input } from '@angular/core';
import { CcSublocationIconComponent } from '../../Shared/cc-sublocation-icon/cc-sublocation-icon.component';

export type WatermarkPageType = 'cast' | 'sublocation' | 'location' | 'faction' | 'campaign' | 'condition' | 'soundtrack' | 'rule';

@Component({
  selector: 'app-journal-watermark',
  standalone: true,
  imports: [CcSublocationIconComponent],
  templateUrl: './journal-watermark.component.html',
  styleUrl: './journal-watermark.component.scss'
})
export class JournalWatermarkComponent {
  readonly pageType = input.required<WatermarkPageType>();
}
