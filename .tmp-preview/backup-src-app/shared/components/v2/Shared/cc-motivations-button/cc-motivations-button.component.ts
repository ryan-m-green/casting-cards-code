import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'cc-motivations-button',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-motivations-button.component.html',
  styleUrl: './cc-motivations-button.component.scss',
})
export class CcMotivationsButtonComponent {
  readonly label = input('Motivations');

  readonly disabled = input(false);

  readonly clicked = output<void>();
}
