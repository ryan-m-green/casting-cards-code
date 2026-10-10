import { Component, input } from '@angular/core';

@Component({
  selector: 'cc-grid-area-title',
  standalone: true,
  templateUrl: './cc-grid-area-title.component.html',
  styleUrl: './cc-grid-area-title.component.scss',
})
export class CcGridAreaTitleComponent {
  readonly title = input<string[]>([]);

  /** Optional path (URL) to an SVG icon rendered to the left of the title. */
  readonly icon = input<string>('');
}
