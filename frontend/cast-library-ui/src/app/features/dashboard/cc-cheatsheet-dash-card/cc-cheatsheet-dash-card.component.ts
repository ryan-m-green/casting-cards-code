import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The dashboard's Cheat Sheet tile: the cheat-sheet entry card's own frame (see `cc-rule-card` in
 * `Campaign/Rules`), drawn small as one of the dashboard's stat cards, wearing the count of the
 * entries the GM's cheat sheet holds.
 */
@Component({
  selector: 'cc-cheatsheet-dash-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-cheatsheet-dash-card.component.html',
  styleUrl: './cc-cheatsheet-dash-card.component.scss',
})
export class CcCheatsheetDashCardComponent {
  /** How many entries the GM's cheat sheet holds. */
  readonly count = input.required<number>();

  /** The word worn across the card's banner. */
  readonly label = input('Cheat Sheet');
}
