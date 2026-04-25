import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LockIconComponent } from '../lock-icon/lock-icon.component';

@Component({
  selector: 'app-lock-pill',
  standalone: true,
  imports: [CommonModule, LockIconComponent],
  template: `
    <span class="lock-pill" [class.locked]="locked" [class.open]="!locked"
          (click)="toggle.emit(!locked)">
      <app-lock-icon [open]="!locked" /> {{ locked ? 'Hidden' : 'Revealed' }}
    </span>
  `
})
export class LockPillComponent {
  @Input() locked = true;
  @Output() toggle = new EventEmitter<boolean>();
}
