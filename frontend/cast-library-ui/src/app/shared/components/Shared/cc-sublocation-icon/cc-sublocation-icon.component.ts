import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-sublocation-icon',
  standalone: true,
  templateUrl: './cc-sublocation-icon.component.html',
  styleUrl: './cc-sublocation-icon.component.scss'
})
export class CcSublocationIconComponent {
  width = input<number>(24);
  color = input<'black' | 'white' | 'current'>('black');
  opacity = input<number>(1);
  fluid = input<boolean>(false);
  private aspectRatio = 1;

  get height(): number {
    return this.width() * this.aspectRatio;
  }

  get strokeColor(): string {
    switch (this.color()) {
      case 'white': return '#FFFFFF';
      case 'current': return 'currentColor';
      default: return '#000000';
    }
  }
}