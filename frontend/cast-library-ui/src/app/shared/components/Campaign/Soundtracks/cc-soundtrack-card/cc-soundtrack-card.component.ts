import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SoundtrackDomain, soundtrackDisplayName } from '../../../../models/soundtrack.model';
import { CcSliderComponent } from '../cc-slider/cc-slider.component';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../../Shared/cc-delete-button/cc-delete-button.component';

@Component({
  selector: 'cc-soundtrack-card',
  standalone: true,
  imports: [CcSliderComponent, CcEditButtonComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-soundtrack-card.component.html',
  styleUrl: './cc-soundtrack-card.component.scss',
})
export class CcSoundtrackCardComponent {
  readonly track = input<SoundtrackDomain | null>(null);

  readonly playing = input(false);

  readonly count = input<number | null>(null);

  readonly label = input('');

  readonly showPlay = input(true);

  readonly showTitle = input(true);

  readonly showEdit = input(true);

  readonly showDelete = input(true);

  readonly playToggle = output<void>();

  readonly edit = output<void>();

  readonly remove = output<void>();

  readonly kindToggle = output<void>();

  readonly volumeChange = output<number>();

  readonly isSoundEffect = computed(() => this.track()?.kind === 'sound_effect');

  readonly name = computed(() => {
    const title = this.track()?.title;
    return title ? soundtrackDisplayName(title) : '';
  });

  readonly heading = computed(() => {
    if (this.count() !== null) return this.label();
    return this.showTitle() ? this.name() : '';
  });

  readonly stripLabel = computed(() => (this.count() !== null ? 'Tracks' : 'Track'));
}
