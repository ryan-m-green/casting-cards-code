import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-escaped-badge',
  standalone: true,
  imports: [],
  templateUrl: './cc-escaped-badge.component.html',
  styleUrl: './cc-escaped-badge.component.scss',
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
})
export class CcEscapedBadgeComponent {
  readonly label = input('Escaped');
}
