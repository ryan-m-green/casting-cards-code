import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-escaped-wings',
  standalone: true,
  imports: [],
  templateUrl: './cc-escaped-wings.component.html',
  styleUrl: './cc-escaped-wings.component.scss',
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
})
export class CcEscapedWingsComponent {
  readonly label = input('Escaped');
}
