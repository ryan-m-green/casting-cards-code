import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from '../../../shared/components/Shared/icon/icon.component';

/** The simple card types the dashboard can dress a stat tile in. */
export type CardStatType = 'cast' | 'sublocation' | 'location' | 'faction' | 'campaign';

/**
 * A dashboard tile shaped like one of the deck's simple cards: the type's own
 * frame and banner, the library's count of that card in the middle, and the
 * type's name in the bottom strip.
 */
@Component({
  selector: 'cc-card-stat',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-stat.component.html',
  styleUrl: './cc-card-stat.component.scss'
})
export class CcCardStatComponent {
  /** Which card type's dressing the tile wears. */
  readonly type = input.required<CardStatType>();

  /** How many cards of this type the library holds. */
  readonly count = input.required<number>();

  /** The type's name, worn across the tile (e.g. "Locations"). */
  readonly label = input.required<string>();
}
