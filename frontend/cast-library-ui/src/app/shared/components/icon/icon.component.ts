import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName = 'cast' | 'sublocation' | 'location' | 'faction' | 'campaign';
export type IconVariant = 'watermark' | 'inline';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon.component.html',
  host: { '[class.variant-inline]': 'variant() === "inline"' },
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; }
    :host(.variant-inline) { height: 100%; }
    .icon-svg { width: auto; height: 100%; display: block; flex-shrink: 0; opacity: 0.2; }
  `]
})
export class IconComponent {
  readonly name    = input.required<IconName>();
  readonly variant = input<IconVariant>('watermark');
}
