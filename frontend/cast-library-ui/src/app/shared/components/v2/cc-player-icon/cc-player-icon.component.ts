import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-player-icon',
  standalone: true,
  templateUrl: './cc-player-icon.component.html',
  styleUrl: './cc-player-icon.component.scss'
})
export class CcPlayerIconComponent {
  width = input<number>(24);
  color = input<'black' | 'white'>('black');
  private aspectRatio = 1; // 24x24 viewBox, so 1:1 ratio

  get height(): number {
    return this.width() * this.aspectRatio;
  }

  get strokeColor(): string {
    return this.color() === 'black' ? '#000000' : '#FFFFFF';
  }
}