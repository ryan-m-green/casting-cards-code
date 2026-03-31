import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-flip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lib-card-inner" [class.flipped]="flipped" (click)="toggle($event)">
      <div class="lib-card-front">
        <ng-content select="[slot=front]" />
      </div>
      <div class="lib-card-back scroll-body">
        <ng-content select="[slot=back]" />
      </div>
    </div>
  `
})
export class CardFlipComponent {
  @Input() flipped = false;
  toggle(e: Event) { e.stopPropagation(); this.flipped = !this.flipped; }
}
