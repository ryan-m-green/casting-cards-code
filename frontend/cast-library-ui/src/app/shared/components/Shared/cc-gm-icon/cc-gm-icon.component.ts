import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-gm-icon',
  standalone: true,
  templateUrl: './cc-gm-icon.component.html',
  styleUrl: './cc-gm-icon.component.scss'
})
export class CcGmIconComponent {
  width = input<number>(24);
  color = input<'black' | 'white'>('black');
  private aspectRatio = 0.6;

  get height(): number {
    return this.width() * this.aspectRatio;
  }

  get fillColor(): string {
    return this.color() === 'black' ? '#000000' : '#FFFFFF';
  }
}
