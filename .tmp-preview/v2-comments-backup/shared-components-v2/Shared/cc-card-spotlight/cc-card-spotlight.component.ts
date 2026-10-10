import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { V2SpotlightService } from '../../../../../core/v2-spotlight.service';

/**
 * cc-card-spotlight
 *
 * The light thrown on a card that has just been revealed to a player: a cone whose wide end is
 * the card's own width, its source standing off the card's centre, and a brighter pool where the
 * beam lands — laid over the card the way a lamp standing to one side would throw it.
 *
 * It is placed inside the card's own box, so it takes the card's size and travels with it: the
 * row it belongs to can scroll and the board it stands on can pan without the light slipping off
 * what it lights. Its host is sized to the card and sits above it; only the pool takes the
 * pointer, and clicking anywhere in the pool is what says the reveal has been seen — it takes the
 * light off the card (see V2SpotlightService), which is this component's whole interaction.
 *
 * It is a leaf of the service's signal and the two things it is handed: a card that is neither
 * revealed itself nor leading to a revealed one draws nothing at all, so the light costs a card
 * nothing until it is wanted.
 *
 * A reveal is not always on the card the viewer is looking at — a cast is revealed while its
 * location's own row is the one on screen — so the card that leads down to it stands in for it and
 * shows the fairy alone (`pointsDown`). Going in turns up the same light on that card itself, and
 * there it is whole: the beam, the pool, and the fairy at the source.
 */
@Component({
  selector: 'cc-card-spotlight',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-spotlight.component.html',
  styleUrl: './cc-card-spotlight.component.scss',
})
export class CcCardSpotlightComponent {
  /** The card this light stands over, by instance id. */
  readonly cardId = input.required<string>();

  /**
   * The switch for the beam and the pool it lands in. While it is on they are drawn whenever this
   * card itself was revealed; off, only the fairy is shown.
   */
  readonly withBeam = input<boolean>(true);

  /**
   * Whether a card this one leads to — deeper in — was revealed, so this card is standing in for
   * it. The light then shows only the fairy, pulsing where she would stand, to point the way down:
   * there is nothing here to have seen, so there is no beam, no pool, and nothing to click away.
   */
  readonly pointsDown = input<boolean>(false);

  /** Emitted when the viewer clicks the light away. */
  readonly dismissed = output<void>();

  private readonly spotlight = inject(V2SpotlightService);

  /** This card was itself revealed for the viewer, and has not been seen yet. */
  readonly lit = computed(() => this.spotlight.spotlighted().has(this.cardId()));

  /** Whether anything is shown at all: this card's own reveal, or a reveal it leads to. */
  readonly showing = computed(() => this.lit() || this.pointsDown());

  /** The beam and its pool: only for this card's own reveal, and only while the switch is on. */
  readonly beam = computed(() => this.lit() && this.withBeam());

  /** Pointing the way down rather than standing in the light itself. */
  readonly pointing = computed(() => this.pointsDown() && !this.lit());

  /** The pool was clicked: the reveal has been seen. */
  onDismiss(): void {
    this.spotlight.dismiss(this.cardId());
    this.dismissed.emit();
  }
}
