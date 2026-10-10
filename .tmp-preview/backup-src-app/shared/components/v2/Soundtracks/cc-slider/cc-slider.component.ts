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
  readonly ariaLabel = input<string | null>(null);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly disabled = input<boolean>(false);

  readonly showTicks = input<boolean>(true);
  readonly showValue = input<boolean>(true);
  readonly suffix = input<string>('');

  readonly accentColor = input<string | null>(null);

  readonly value = model<number>(80);

  readonly valueChange = output<number>();
  readonly commit = output<number>();

  readonly displayText = computed(() => `${this.value()}${this.suffix()}`);

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
