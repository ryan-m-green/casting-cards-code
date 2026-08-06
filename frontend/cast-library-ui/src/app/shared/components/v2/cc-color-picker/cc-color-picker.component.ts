import { Component, input, output, model, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'cc-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-color-picker.component.html',
  styleUrl: './cc-color-picker.component.scss',
})
export class CcColorPickerComponent {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly internalLabel = input<string>('');

  readonly color = model<string>('#B8D820');

  readonly colorChange = output<string>();

  isCampaignContext = computed(() => this.context() === 'campaign');

  onColorChange(event: Event): void {
    if (this.disabled()) return;
    const color = (event.target as HTMLInputElement).value;
    this.color.set(color);
    this.colorChange.emit(color);
  }
}