import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CardSpotlightService } from '../../../../../core/card-spotlight.service';

@Component({
  selector: 'cc-card-spotlight',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-spotlight.component.html',
  styleUrl: './cc-card-spotlight.component.scss',
})
export class CcCardSpotlightComponent {
  readonly cardId = input.required<string>();

  readonly withBeam = input<boolean>(true);

  readonly pointsDown = input<boolean>(false);

  readonly dismissed = output<void>();

  private readonly spotlight = inject(CardSpotlightService);

  readonly lit = computed(() => this.spotlight.spotlighted().has(this.cardId()));

  readonly showing = computed(() => this.lit() || this.pointsDown());

  readonly beam = computed(() => this.lit() && this.withBeam());

  readonly pointing = computed(() => this.pointsDown() && !this.lit());

  onDismiss(event: MouseEvent): void {
    event.stopPropagation();
    this.spotlight.dismiss(this.cardId());
    this.dismissed.emit();
  }
}
