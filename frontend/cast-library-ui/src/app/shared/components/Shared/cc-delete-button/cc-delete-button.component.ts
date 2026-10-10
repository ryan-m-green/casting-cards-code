import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'cc-delete-button',
  standalone: true,
  imports: [],
  templateUrl: './cc-delete-button.component.html',
  styleUrl: './cc-delete-button.component.scss'
})
export class CcDeleteButtonComponent {
  readonly label = input('Delete');

  readonly confirmLabel = input('Delete');

  readonly disabled = input(false);

  readonly requested = output<void>();

  readonly confirmed = output<void>();

  readonly pending = signal(false);

  request(domEvent: Event) {
    domEvent.stopPropagation();
    this.pending.set(true);
    this.requested.emit();
  }

  cancel(domEvent: Event) {
    domEvent.stopPropagation();
    this.pending.set(false);
  }

  confirm(domEvent: Event) {
    domEvent.stopPropagation();
    this.pending.set(false);
    this.confirmed.emit();
  }

  reset() {
    this.pending.set(false);
  }
}
