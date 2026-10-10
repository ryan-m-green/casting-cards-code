import { Component, input, output, model, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'cc-counter-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-counter-badge.component.html',
  styleUrl: './cc-counter-badge.component.scss',
})
export class CcCounterBadgeComponent {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly min = input<number>(0);
  readonly max = input<number>(99);

  readonly count = model<number>(0);

  readonly countChange = output<number>();

  isCampaignContext = computed(() => this.context() === 'campaign');

  canDecrement = computed(() => {
    return !this.disabled() && this.count() > this.min();
  });

  canIncrement = computed(() => {
    return !this.disabled() && this.count() < this.max();
  });

  decrement(): void {
    if (!this.canDecrement()) return;
    const newValue = this.count() - 1;
    this.count.set(newValue);
    this.countChange.emit(newValue);
  }

  increment(): void {
    if (!this.canIncrement()) return;
    const newValue = this.count() + 1;
    this.count.set(newValue);
    this.countChange.emit(newValue);
  }
}