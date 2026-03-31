import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lock-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="lock-pill" [class.locked]="locked" [class.open]="!locked"
          (click)="toggle.emit(!locked)">
      {{ locked ? '🔒' : '🔓' }} {{ locked ? 'Hidden' : 'Revealed' }}
    </span>
  `
})
export class LockPillComponent {
  @Input() locked = true;
  @Output() toggle = new EventEmitter<boolean>();
}
