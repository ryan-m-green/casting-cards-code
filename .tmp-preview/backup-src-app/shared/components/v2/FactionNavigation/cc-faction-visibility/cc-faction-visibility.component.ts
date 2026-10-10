import { Component, computed, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'cc-faction-visibility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-faction-visibility.component.html',
  styleUrl: './cc-faction-visibility.component.scss'
})
export class CcFactionVisibilityComponent {
  readonly label = input<string>('Faction Visibility');

  readonly context = input<'journal' | 'campaign'>('journal');

  readonly hidden = model<boolean>(false);

  readonly disabled = input<boolean>(false);

  readonly hiddenHint = input<string>('In the shadows');
  readonly visibleHint = input<string>('Out in the open');

  readonly id = input<string>(`faction-visibility-${Math.random().toString(36).substr(2, 9)}`);

  readonly isCampaign = computed(() => this.context() === 'campaign');
}
