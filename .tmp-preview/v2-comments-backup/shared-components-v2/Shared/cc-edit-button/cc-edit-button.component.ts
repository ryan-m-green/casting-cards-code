import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * cc-edit-button
 *
 * The campaign shell's edit control: the campaign's own repair tools — the wrench the encounter cards,
 * their initiative circle and the storyline cards have always put on an edit — in the square the world
 * map's own image control wears, so that an edit reads the same wherever a row offers one. Shared so
 * that the art, its inking and the campaign colour it answers to live in one place.
 *
 * The control is the wrench and nothing else: what is being edited is the host's to say, in `label`
 * (the button's tooltip and its accessible name). `clicked` is raised when it is pressed, and the host
 * does the work — opening its editor, its drawer, or its file picker. `disabled` holds the control
 * while the host's own write is in flight, the way the delete control is held (see cc-delete-button).
 *
 *   <cc-edit-button
 *     label="Edit this encounter"
 *     [disabled]="busy()"
 *     (clicked)="editRequested.emit()" />
 *
 * A host that needs the control at another size — the 28px ambiance row, the 42px detail rows, a full
 * touch target on a phone — sets `--cc-edit-size` and `--cc-edit-icon-size`, the same way the delete
 * control's hosts set its own.
 */
@Component({
  selector: 'cc-edit-button',
  standalone: true,
  imports: [],
  /** OnPush: the control is a leaf of two signal inputs, so it is redrawn only when one of them moves. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-edit-button.component.html',
  styleUrl: './cc-edit-button.component.scss',
})
export class CcEditButtonComponent {
  /** What is being edited, said in the button's tooltip and its accessible name. */
  readonly label = input('Edit');

  /** The host's write is in flight, so the control is held while it lands. */
  readonly disabled = input(false);

  /** The control was pressed: the host opens whatever edits the thing it named. */
  readonly clicked = output<void>();
}
