import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'cc-edit-button',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-edit-button.component.html',
  styleUrl: './cc-edit-button.component.scss',
})
export class CcEditButtonComponent {
  readonly label = input('Edit');

  readonly text = input('');

  readonly disabled = input(false);

  readonly clicked = output<void>();
}
