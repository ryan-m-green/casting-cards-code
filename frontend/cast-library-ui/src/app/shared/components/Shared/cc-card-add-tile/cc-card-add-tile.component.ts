import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The ＋ tile a card row ends with — the way a library page grows its collection.
 *
 * It is the tile the campaign's card rows close on (see cc-card-navigation's `.location-add`), kept
 * card-sized so it stands in a row of cards, and the row around it is the only thing that places
 * it: the caller sweeps it in as the last slide of a Swiper row.
 *
 * It comes in two versions. The tile as it stands leads to the form that makes a card (`link`); the
 * capturing version (`capture`) instead takes the code that opens a collection — the way into
 * campaigns that were joined by a shared code, which have no form of their own to be made on.
 */
@Component({
  selector: 'cc-card-add-tile',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-add-tile.component.html',
  styleUrl: './cc-card-add-tile.component.scss',
})
export class CcCardAddTileComponent {
  private readonly injector = inject(Injector);

  /** What the tile makes — "New location", "New cast" — in the library's own wording. */
  readonly label = input('New card');

  /** The line over the tile, which says what opening it does. */
  readonly title = input('');

  /** Where the form that makes the card lives. */
  readonly link = input<string | null>(null);

  /**
   * Where the collection has met its plan's limit: the tile then stays in place, dimmed, and says
   * why it cannot be opened rather than leading to a form the page would refuse.
   */
  readonly locked = input(false);

  /** What the tile says it cannot do while it is locked. */
  readonly lockedReason = input('');

  /** Whether the tile takes a code (see the class comment) rather than leading to a form. */
  readonly capture = input(false);

  /** What the field the tile opens is for — "Shared code". */
  readonly captureLabel = input('Code');

  /** What the field's button says — "Join", "Redeem". */
  readonly submitLabel = input('Submit');

  /** Whether the caller is still working through the code that was handed to it. */
  readonly busy = input(false);

  /**
   * What the caller made of that code. It is said in the field, and its settling is what closes the
   * field: a submit that finishes without one clears the code and closes the field, so a code that
   * worked is not offered twice — while one that failed leaves both, with the reason in place, for
   * the code to be checked and offered again.
   */
  readonly error = input('');

  /** The code the field was given, handed over when its button is pressed. */
  readonly codeSubmit = output<string>();

  /** Whether the field is open — false shows the tile at rest, with its ＋ and label. */
  readonly open = signal(false);

  readonly code = signal('');

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  private wasBusy = false;

  constructor() {
    /* The field is opened to be typed into, so it takes the caret as soon as it is there. */
    effect(() => {
      if (!this.open()) return;
      afterNextRender(() => this.codeInput()?.nativeElement.focus(), { injector: this.injector });
    });

    /* The code is spent once the caller has taken it — the beat the join input keeps as well. */
    effect(() => {
      const busy = this.busy();
      if (this.wasBusy && !busy && !this.error()) {
        this.code.set('');
        this.open.set(false);
      }
      this.wasBusy = busy;
    });
  }

  onTileClick(event: Event) {
    if (this.locked()) {
      event.preventDefault();
      return;
    }

    if (this.capture()) {
      event.preventDefault();
      this.open.set(true);
    }
  }

  closeCapture() {
    this.open.set(false);
    this.code.set('');
  }

  onSubmit(event: Event) {
    event.preventDefault();

    const code = this.code().trim();
    if (!code || this.busy()) return;

    this.codeSubmit.emit(code);
  }
}
