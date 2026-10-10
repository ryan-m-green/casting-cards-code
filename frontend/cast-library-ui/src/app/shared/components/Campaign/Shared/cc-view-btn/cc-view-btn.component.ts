import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-cc-view-btn',
  standalone: true,
  imports: [],
  templateUrl: './cc-view-btn.component.html',
  styleUrl: './cc-view-btn.component.scss',
})
export class CcViewBtnComponent {
  label = input('View content');

  clicked = output<void>();
}
