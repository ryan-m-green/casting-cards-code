import { Component, input, output, model, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'cc-faction-colors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-faction-colors.component.html',
  styleUrl: './cc-faction-colors.component.scss',
})
export class CcFactionColorsComponent {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly hideColorPickers = input<boolean>(false);
  readonly hidePerception = input<boolean>(false);

  readonly evilColor = model<string>('#B8D820');
  readonly goodColor = model<string>('#FFC0DC');
  readonly perception = model<number>(0);

  readonly evilColorChange = output<string>();
  readonly goodColorChange = output<string>();
  readonly perceptionChange = output<number>();

  isCampaignContext = computed(() => this.context() === 'campaign');

  perceptionLabel = computed(() => {
    const v = this.perception();
    if (v ===  5) return 'Trusted';
    if (v ===  4) return 'Allied';
    if (v ===  3) return 'Loyal';
    if (v ===  2) return 'Welcoming';
    if (v ===  1) return 'Friendly';
    if (v ===  0) return 'Neutral';
    if (v === -1) return 'Wary';
    if (v === -2) return 'Suspicious';
    if (v === -3) return 'Unfriendly';
    if (v === -4) return 'Hostile';
    if (v === -5) return 'Enemy';
    return 'Neutral';
  });

  onEvilColorChange(event: Event): void {
    if (this.disabled()) return;
    const color = (event.target as HTMLInputElement).value;
    this.evilColor.set(color);
    this.evilColorChange.emit(color);
  }

  onGoodColorChange(event: Event): void {
    if (this.disabled()) return;
    const color = (event.target as HTMLInputElement).value;
    this.goodColor.set(color);
    this.goodColorChange.emit(color);
  }

  onPerceptionChange(event: Event): void {
    if (this.disabled()) return;
    const value = +(event.target as HTMLInputElement).value;
    this.perception.set(value);
    this.perceptionChange.emit(value);
  }
}