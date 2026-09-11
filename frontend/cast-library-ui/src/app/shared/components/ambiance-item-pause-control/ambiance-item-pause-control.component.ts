import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AmbiancePauseMode } from '../../models/soundtrack.model';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../v2/cc-campaign-dropdown/cc-campaign-dropdown.component';

@Component({
  selector: 'app-ambiance-item-pause-control',
  standalone: true,
  imports: [CommonModule, FormsModule, CampaignDropdownComponent],
  template: `
    <div class="pause-control">
      <cc-campaign-dropdown
        [options]="pauseModeOptions"
        [fontSize]="'13px'"
        [style.width]="'150px'"
        [style.margin-bottom]="'0'"
        [ngModel]="pauseMode()"
        (ngModelChange)="pauseMode.set($any($event))"
      />

      @if (pauseMode() === 'manual') {
        <label class="pause-control__field">
          <input
            type="number"
            min="1"
            max="3600"
            [ngModel]="pauseDelaySeconds()"
            (ngModelChange)="pauseDelaySeconds.set($event)"
            aria-label="Pause delay seconds"
          />
          <span>s</span>
        </label>
      }

      @if (pauseMode() === 'random') {
        <label class="pause-control__field">
          <input
            type="number"
            min="1"
            max="3600"
            [ngModel]="pauseMinSeconds()"
            (ngModelChange)="pauseMinSeconds.set($event)"
            aria-label="Minimum pause seconds"
          />
          <span>&ndash;</span>
          <input
            type="number"
            min="1"
            max="3600"
            [ngModel]="pauseMaxSeconds()"
            (ngModelChange)="pauseMaxSeconds.set($event)"
            aria-label="Maximum pause seconds"
          />
          <span>s</span>
        </label>
      }
    </div>
  `,
  styles: [
    `
      .pause-control {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .pause-control__field {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: 'Crimson Text', serif;
        font-size: 12px;
        color: rgba(200, 225, 235, 0.88);
      }

      .pause-control__field input {
        width: 48px;
        background: rgba(14, 24, 32, 0.8);
        border: 1px solid rgba(167, 121, 233, 0.4);
        border-radius: 6px;
        color: rgb(200, 225, 235);
        font-family: 'Crimson Text', serif;
        font-size: 13px;
        padding: 5px 6px;
      }

      .pause-control__field input:focus {
        outline: none;
        border-color: var(--portal-color, #6e28d0);
      }
    `,
  ],
})
export class AmbianceItemPauseControlComponent {
  readonly pauseModeOptions: CampaignDropdownOption[] = [
    { value: 'none', label: 'Play once' },
    { value: 'manual', label: 'Every' },
    { value: 'random', label: 'Random' }
  ];

  pauseMode = model<AmbiancePauseMode>('none');
  pauseDelaySeconds = model<number | null>(null);
  pauseMinSeconds = model<number | null>(null);
  pauseMaxSeconds = model<number | null>(null);
}
