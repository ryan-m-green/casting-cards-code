import { Component, input, output, model, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'cc-political-influence',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-political-influence.component.html',
  styleUrl: './cc-political-influence.component.scss',
})
export class CcPoliticalInfluenceComponent {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');

  readonly influence = model<number>(0);
  readonly influenceChange = output<number>();

  isCampaignContext = computed(() => this.context() === 'campaign');

  onInfluenceChange(event: Event): void {
    if (this.disabled()) return;
    const value = +(event.target as HTMLInputElement).value;
    this.influence.set(value);
    this.influenceChange.emit(value);
  }
}