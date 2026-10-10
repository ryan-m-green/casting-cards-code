import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-faction-icon',
  standalone: true,
  templateUrl: './cc-faction-icon.component.html',
  styleUrl: './cc-faction-icon.component.scss'
})
export class CcFactionIconComponent {
  width = input<number>(24);
  color = input<'black' | 'white'>('black');
  opacity = input<number>(1);
  private aspectRatio = 1; // 24x24 viewBox, so 1:1 ratio

  get height(): number {
    return this.width() * this.aspectRatio;
  }

  get strokeColor(): string {
    return this.color() === 'black' ? '#000000' : '#FFFFFF';
  }
}