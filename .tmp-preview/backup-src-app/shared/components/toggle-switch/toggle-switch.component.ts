import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  template: `
    <button
      type="button"
      class="toggle"
      [class.toggle--on]="checked()"
      [class.toggle--disabled]="disabled()"
      [disabled]="disabled()"
      (click)="onToggle()"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
    >
      <span class="toggle__thumb"></span>
    </button>
  `,
  styles: [
    `
      .toggle {
        position: relative;
        width: 40px;
        height: 22px;
        border-radius: 11px;
        border: 1px solid rgba(167, 121, 233, 0.4);
        background: rgba(14, 24, 32, 0.8);
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        transition: background 0.18s ease, border-color 0.18s ease;
      }

      .toggle--on {
        background: var(--portal-color, #6e28d0);
        border-color: var(--portal-color, #6e28d0);
      }

      .toggle__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        transition: transform 0.18s ease;
      }

      .toggle--on .toggle__thumb {
        transform: translateX(18px);
      }

      .toggle--disabled {
        cursor: default;
        opacity: 0.5;
        pointer-events: none;
      }
    `,
  ],
})
export class ToggleSwitchComponent {
  checked = model(false);
  label = input('');
  disabled = input(false);

  onToggle(): void {
    if (this.disabled()) return;
    this.checked.set(!this.checked());
  }
}
