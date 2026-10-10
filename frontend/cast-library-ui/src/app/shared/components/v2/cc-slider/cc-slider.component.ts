import { Component, computed, input, model, output } from '@angular/core';

@Component({
  selector: 'cc-slider',
  standalone: true,
  imports: [],
  templateUrl: './cc-slider.component.html',
  styleUrl: './cc-slider.component.scss',
})
export class CcSliderComponent {
  readonly label = input<string>('');
  /** Optional accessible name; falls back to label() when not provided. */
  readonly ariaLabel = input<string | null>(null);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly disabled = input<boolean>(false);

  /** Show the decorative tick strip under the track (matches cc-political-influence). */
  readonly showTicks = input<boolean>(true);
  /** Show the numeric readout to the right of the track. */
  readonly showValue = input<boolean>(true);
  /** Text appended to the readout, e.g. '%'. */
  readonly suffix = input<string>('');

  /** Optional CSS color for the accent/tick strip. Falls back to --portal-color. */
  readonly accentColor = input<string | null>(null);

  readonly value = model<number>(80);

  /** Emitted continuously while the thumb is dragged. */
  readonly valueChange = output<number>();
  /** Emitted once the user commits a new value (mouse/keyboard release). */
  readonly commit = output<number>();

  readonly displayText = computed(() => `${this.value()}${this.suffix()}`);

  /** Decorative range markers - 11 evenly spaced ticks, matching cc-political-influence. */
  tickMarks = computed(() => Array.from({ length: 11 }, (_, i) => i));

  onInput(event: Event): void {
    if (this.disabled()) return;
    const next = this.parseValue(event);
    this.value.set(next);
    this.valueChange.emit(next);
  }

  onCommit(event: Event): void {
    if (this.disabled()) return;
    const next = this.parseValue(event);
    this.value.set(next);
    this.commit.emit(next);
  }

  private parseValue(event: Event): number {
    const input = event.target as HTMLInputElement;
    const parsed = Number(input.value);
    return Number.isFinite(parsed) ? parsed : this.min();
  }
}
