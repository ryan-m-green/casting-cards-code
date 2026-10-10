import { Component, input, output } from '@angular/core';

/**
 * Shared 44x44 "view" button (eye icon) used to open read-only content in the
 * right drawer. It carries no positioning of its own - the host that places it
 * decides where it sits.
 */
@Component({
  selector: 'app-cc-view-btn',
  standalone: true,
  imports: [],
  templateUrl: './cc-view-btn.component.html',
  styleUrl: './cc-view-btn.component.scss',
})
export class CcViewBtnComponent {
  /** Tooltip and accessible label for the button. */
  label = input('View content');

  /** Emitted when the button is activated. */
  clicked = output<void>();
}
