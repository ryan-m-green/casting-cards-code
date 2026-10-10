import { Component, input, output, signal } from '@angular/core';

/**
 * cc-delete-button
 *
 * The campaign shell's delete control, with its own "are you sure" built in — the button the
 * storyline cards wear, shared so any card can have the same one. The dagger is the question;
 * clicking it puts ✕ and a red Delete in its place until the DM either backs out or goes
 * through with it, so deleting always takes a second, deliberate click.
 *
 * Every button stops the click from travelling, so a host that draws this inside something
 * clickable (a card that flips) never has that click fired by the control.
 *
 * `requested` is raised when the question is asked — for a host that has something transient
 * of its own to put away — and `confirmed` when the DM says yes. `reset()` stands it back
 * down, for a host that has to (a card flipped back to its front).
 *
 * The control is drawn at the shell's action-button size. A host that needs it smaller sets
 * the custom properties on the element — see the faction card, whose corner is tighter than
 * an action row.
 */
@Component({
  selector: 'cc-delete-button',
  standalone: true,
  imports: [],
  templateUrl: './cc-delete-button.component.html',
  styleUrl: './cc-delete-button.component.scss'
})
export class CcDeleteButtonComponent {
  /** What is being deleted, said in the button's tooltip and its accessible name. */
  readonly label = input('Delete');

  /** What the confirming button reads. Hosts whose action is not a whole delete — a
   *  membership taken off, say — name it here; it stays `Delete` otherwise. */
  readonly confirmLabel = input('Delete');

  /** The host's write is in flight, so its buttons are held while it lands. */
  readonly disabled = input(false);

  /** The question was asked (the dagger was clicked): nothing has been deleted. */
  readonly requested = output<void>();

  /** The DM said yes. */
  readonly confirmed = output<void>();

  /** True while the question is on screen. */
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

  /** Puts the control back to its dagger, without asking the host. */
  reset() {
    this.pending.set(false);
  }
}
