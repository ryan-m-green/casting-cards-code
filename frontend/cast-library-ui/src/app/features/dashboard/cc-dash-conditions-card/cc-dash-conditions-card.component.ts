import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CcCardWatermarkComponent } from '../../../shared/components/Campaign/CardNavigation/cc-card-watermark/cc-card-watermark.component';

/**
 * The dashboard's Conditions tile: the soundtrack card's frame, dressed in the condition library's
 * yellow and edged in the journal's dark brown, wearing the library's count the way every other
 * dashboard stat card does.
 *
 * The soundtrack card it is copied from draws the instruments sigil behind the count; this card
 * wears the cast card's icon there instead (as `cc-condition-card` does) and carries a condition
 * ring across itself, lettered with the card's own word. The title is the card's own, so the
 * dashboard only has to hand it a number.
 */
@Component({
  selector: 'cc-dash-conditions-card',
  standalone: true,
  imports: [CcCardWatermarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-dash-conditions-card.component.html',
  styleUrl: './cc-dash-conditions-card.component.scss',
})
export class CcDashConditionsCardComponent {
  /** How many conditions the GM's condition library holds. */
  readonly count = input.required<number>();

  /** The word worn across the card's banner, foot strip and ring. */
  readonly title = input('Conditions');
}
