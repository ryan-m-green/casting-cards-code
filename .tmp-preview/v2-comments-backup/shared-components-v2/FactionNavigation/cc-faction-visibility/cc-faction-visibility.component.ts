import { Component, computed, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * cc-faction-visibility
 *
 * A faction's visibility control: the switch, its heading, and the line of prose under it that
 * says what the setting means. Lifted out of the faction form so any faction field-set can wear
 * the same control.
 *
 * It is drawn in either of the app's two looks, picked with `context`:
 *
 *  - `journal`  the parchment forms — the portal import card, the journal faction form: a
 *               brown-warm track with a gold knob.
 *  - `campaign` the dark campaign shell, where this form lives in the right drawer: a black
 *               track ringed in the portal violet, with the violet filling in when the faction
 *               goes into the shadows.
 *
 * The setting itself is a two-way `hidden`, so a host can bind `[(hidden)]` or hold it in a form
 * control and write it back on `(hiddenChange)`.
 */
@Component({
  selector: 'cc-faction-visibility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-faction-visibility.component.html',
  styleUrl: './cc-faction-visibility.component.scss'
})
export class CcFactionVisibilityComponent {
  /** The field's heading. */
  readonly label = input<string>('Faction Visibility');

  /** Which of the two looks to draw the control in. */
  readonly context = input<'journal' | 'campaign'>('journal');

  /** The setting itself: true = the faction operates in the shadows. */
  readonly hidden = model<boolean>(false);

  readonly disabled = input<boolean>(false);

  /**
   * The line under the switch, one for each way the setting can be. Kept short: it sits beside
   * the switch, in whatever box the control was dropped into, and wraps from there.
   */
  readonly hiddenHint = input<string>('In the shadows');
  readonly visibleHint = input<string>('Out in the open');

  /** Ties the heading to the switch, so the words label it and clicking them works. */
  readonly id = input<string>(`faction-visibility-${Math.random().toString(36).substr(2, 9)}`);

  readonly isCampaign = computed(() => this.context() === 'campaign');
}
