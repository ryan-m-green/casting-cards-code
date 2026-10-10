import { Component, computed, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AmbiancePauseMode } from '../../../../models/soundtrack.model';

interface PauseChoice {
  mode: AmbiancePauseMode;
  label: string;
}

/**
 * How a playlist entry comes round again — whether it plays once, every so often, or after a random
 * wait.
 *
 * The three choices stand as buttons on one row, and picking one lays the values it needs on the row
 * beneath them, so a track's timing is set without a menu unfolding over the card.
 *
 * `context` inks the control for the room it stands in: the campaign's dark panels, or the journal's
 * parchment.
 */
@Component({
  selector: 'cc-soundtrack-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { '[class.is-bare]': 'bare()' },
  templateUrl: './cc-soundtrack-controls.component.html',
  styleUrl: './cc-soundtrack-controls.component.scss',
})
export class CcSoundtrackControlsComponent {
  /** The room the control stands in, so it inks itself to match. */
  readonly context = input<'journal' | 'campaign'>('campaign');

  /**
   * Whether the caller lays the rows out itself. When bare, the wrapper steps out of the way so the
   * play-mode row and the values row become the caller's own flex items — which is how the journal's
   * playlist card sets the volume beside the buttons and drops the values onto the row under them.
   */
  readonly bare = input(false);

  readonly isJournal = computed(() => this.context() === 'journal');

  readonly choices: PauseChoice[] = [
    { mode: 'none', label: 'Play once' },
    { mode: 'manual', label: 'Every' },
    { mode: 'random', label: 'Random' },
  ];

  pauseMode = model<AmbiancePauseMode>('none');
  pauseDelaySeconds = model<number | null>(null);
  pauseMinSeconds = model<number | null>(null);
  pauseMaxSeconds = model<number | null>(null);
}