import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from '../../../Shared/icon/icon.component';

export type CardSymbol = 'location' | 'sublocation' | 'cast' | 'faction';

@Component({
  selector: 'cc-card-watermark',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-watermark.component.html',
  styleUrl: './cc-card-watermark.component.scss'
})
export class CcCardWatermarkComponent {
  readonly name = input.required<CardSymbol>();
}
