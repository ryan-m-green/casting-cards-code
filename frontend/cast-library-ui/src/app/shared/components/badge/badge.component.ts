import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="type">{{ label }}</span>`
})
export class BadgeComponent {
  @Input() type: 'dm' | 'player' | 'ai' = 'dm';
  @Input() label = '';
}
