import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';

@Component({
  selector: 'cc-encounter-controls',
  standalone: true,
  imports: [CcEditButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-encounter-controls.component.html',
  styleUrl: './cc-encounter-controls.component.scss'
})
export class CcEncounterControlsComponent {
  readonly encounterId = input<string>('');
  readonly busy = input(false);
  readonly canStart = input(false);
  readonly canEnd = input(false);
  readonly showEdit = input(true);

  readonly allRequested = output<void>();
  readonly startRequested = output<void>();
  readonly editRequested = output<void>();
  readonly endRequested = output<void>();

  readonly endPending = signal(false);

  constructor() {
    effect(() => {
      this.encounterId();
      untracked(() => this.endPending.set(false));
    });
  }

  requestEnd(): void {
    this.endPending.set(true);
  }

  cancelEnd(): void {
    this.endPending.set(false);
  }

  confirmEnd(): void {
    this.endPending.set(false);
    this.endRequested.emit();
  }
}
