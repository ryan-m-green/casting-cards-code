import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lock-icon',
  standalone: true,
  template: `
    <svg class="lock-icon" [class.lock-icon--open]="open"
         xmlns="http://www.w3.org/2000/svg"
         width="14" height="16" viewBox="0 0 14 16"
         fill="none" aria-hidden="true">
      <path class="lock-shackle"
            [attr.d]="open ? openPath : closedPath"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="1" y="7" width="12" height="9" rx="2" fill="currentColor"/>
    </svg>
  `,
  styles: [`
    .lock-icon {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
    }
  `]
})
export class LockIconComponent {
  @Input() open = false;

  readonly closedPath = 'M3 7 L3 4 C3 0.5 11 0.5 11 4 L11 7';
  readonly openPath   = 'M3 7 L3 4 C3 0.5 11 0.5 11 4 L11 1';
}
