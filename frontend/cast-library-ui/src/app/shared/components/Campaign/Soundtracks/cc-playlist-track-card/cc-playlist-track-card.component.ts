import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AmbiancePauseMode, PlaylistTrackItem } from '../../../../models/soundtrack.model';
import { CcSliderComponent } from '../cc-slider/cc-slider.component';
import { CcSoundtrackControlsComponent } from '../cc-soundtrack-controls/cc-soundtrack-controls.component';

/**
 * One entry of a playlist, as a card.
 *
 * It stands in a swipable row and holds the whole of an entry's options: which track it is (by name),
 * its volume, and how it is played — when it comes round again and how long it waits, whether that is
 * a fixed pause or a random one.
 *
 * The play settings are written straight onto the item it was handed (the same object the builder
 * holds), while the volume and the ordering are raised to the caller, which owns them.
 */
@Component({
  selector: 'cc-playlist-track-card',
  standalone: true,
  imports: [CcSliderComponent, CcSoundtrackControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-playlist-track-card.component.html',
  styleUrl: './cc-playlist-track-card.component.scss',
})
export class CcPlaylistTrackCardComponent {
  readonly item = input.required<PlaylistTrackItem>();

  /** The track's name, as the caller resolves it. */
  readonly name = input.required<string>();

  /** Where this card sits in the running order, so it can be moved. */
  readonly index = input.required<number>();

  readonly total = input.required<number>();

  readonly isSoundEffect = input(false);

  readonly volumeChange = output<number>();

  readonly moveEarlier = output<void>();

  readonly moveLater = output<void>();

  readonly remove = output<void>();

  setPauseMode(value: AmbiancePauseMode) { this.item().pauseMode = value; }
  setPauseDelay(value: number | null) { this.item().pauseDelaySeconds = value; }
  setPauseMin(value: number | null) { this.item().pauseMinSeconds = value; }
  setPauseMax(value: number | null) { this.item().pauseMaxSeconds = value; }
}