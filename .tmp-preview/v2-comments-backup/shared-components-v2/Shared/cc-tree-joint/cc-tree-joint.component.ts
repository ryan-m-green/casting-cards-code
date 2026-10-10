import { Component, ChangeDetectionStrategy, ElementRef, effect, inject, input } from '@angular/core';
import { TREE_JOINT_FADE_MS, TREE_JOINT_RETURN_DELAY_MS, prefersReducedMotion } from '../../../../directives/cc-card-fade.directive';


/**
 * Which way the marker runs: down the board — from a card's own border to the thing hanging under
 * it — or flat out of a card's side border into the card standing beside it.
 */
export type TreeJointOrientation = 'down' | 'side';

/**
 * Where the marker takes its stand: the box it measures itself from, and the corner it leaves that
 * box by.
 *
 * - `gap` — the default. The marker hangs in the 24px its container leaves between the two layers
 *   of the board (the card's own bottom border above, the stack's top edge below), measured up from
 *   the box it is laid in.
 * - `box` — the marker fills the box its container lays out for it: that box's own top edge and its
 *   own height (`top: 0; height: 100%`). For a container that is itself the marker's own area — the
 *   75 x 24 the foot lays out for the three marks at the breadcrumb's card.
 * - `corner-left` / `corner-right` — the box above taken out to nothing and then turned, so the run
 *   leaves its container's own bottom corner rather than the middle of its border: out down and
 *   left on the left corner, down and right on the right.
 */
export type TreeJointStand = 'gap' | 'box' | 'corner-left' | 'corner-right';

/**
 * cc-tree-joint
 *
 * The mark the board's tree is drawn with: a 1px stem dropped from the middle of a card's own
 * border, a bead on that border where the stem leaves it, and a chevron at the stem's foot pointing
 * the way in. The stem is the edge between two layers of the board and the chevron is the way down,
 * so a viewer about to tap a card in the stack below has been told twice over: these cards belong to
 * that card, and going in means going down.
 *
 * It is one marker with one set of measures, stood in a handful of places: under a middle-row card
 * with anything hanging off it, three times over on the base of the breadcrumb's own card, and on
 * its side in the breadcrumb's gap to point from a location card into the sublocation card beside
 * it. What changes from one stand to the next is only the box the marker takes its measure from and
 * the axis its run is turned along — and that is all the two inputs of the stand are for: `stand`
 * says which box, `orientation` says which axis.
 *
 * The marker's box IS the component's own host, not an element drawn inside it: the marker has to
 * be out of flow, since one left in flow inside a container that lays its children out in a row
 * (the breadcrumb's own gap between its two drop spots) would be laid out as a flex item and push
 * the two cards it stands between apart. So a host that lays this out says where the marker is to
 * be drawn, and the stand says how it is drawn there (see the style sheet).
 *
 * A joint goes with the cards it draws the tree of, but never beside them: the row raises
 * `transitioning` on every joint before it takes its cards away, and puts it down as the new cards
 * go in, so the marks are withdrawn in the first beat of a change and drawn again only once the new
 * cards have landed (see the class body, and the figures in cc-card-fade.directive).

 * A line drawn over the board, never a thing of its own: it takes no pointer (`pointer-events`) and
 * reads out nothing (the host's own `aria-hidden`), so the card or the stack it points at stays the
 * only thing there is to tap.
 */
@Component({
  selector: 'cc-tree-joint',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-tree-joint.component.html',
  styleUrl: './cc-tree-joint.component.scss',
  host: {
    /* Decoration: nothing it draws is a thing to be read out. */
    'aria-hidden': 'true',
    '[class.tree-joint--side]': "orientation() === 'side'",
    '[class.tree-joint--box]': "stand() === 'box'",
    '[class.tree-joint--corner-left]': "stand() === 'corner-left'",
    '[class.tree-joint--corner-right]': "stand() === 'corner-right'",
  },
})
export class CcTreeJointComponent {
  /** Which way the marker runs. */
  readonly orientation = input<TreeJointOrientation>('down');

  /** Where the marker takes its stand. */
  readonly stand = input<TreeJointStand>('gap');

  /**
   * Whether the board this marker belongs to is changing its cards: the row's own `beginTransition`
   * flag, raised over the whole of a change and bound here exactly as it is bound to that row's own
   * cards as `ccCardFadeOut` (see the class doc).
   */
  readonly transitioning = input<boolean>(false);

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** The viewer has asked for less movement: the marker is simply up, or simply away. */
  private readonly reducedMotion = prefersReducedMotion();

  /** The fade the marker is on — going, or coming back — so that the next one can take it off. */
  private fade: Animation | null = null;

  /** Whether the board has asked the marker away: what the last thing it said amounts to. */
  private away = false;

  /** Whether the board has said anything yet: a marker born mid-change arrives with the change. */
  private begun = false;

  constructor() {
    // The board's own word is the only thing watched here: whether the marks are to stand or to be
    // away — and, on the marker's first sight of its board, that a joint born mid-change is
    // arriving with that change rather than having stood there before it.
    effect(() => {
      const away = this.transitioning();
      if (this.begun && away === this.away) return;

      this.begun = true;
      this.away = away;

      if (this.reducedMotion) return;

      if (away) {
        this.withdraw();
      } else {
        this.draw();
      }
    });
  }

  /**
   * The board taking its cards away: the marker goes with them, and first — at once, over its own
   * short measure, so the tree is off the board while the cards it draws the tree of are still
   * standing.
   */
  private withdraw(): void {
    // What the marker is being painted at *now* — nothing at all, if the row is mid-change and the
    // marks have not been drawn back yet — so a change arriving over one that has barely finished
    // cannot flash the tree up only to take it straight down again.
    const from = this.painted();
    this.fade?.cancel();
    this.fade = this.host.nativeElement.animate(
      [{ opacity: from }, { opacity: 0 }],
      { duration: TREE_JOINT_FADE_MS, easing: 'ease', fill: 'forwards' }
    );
  }

  /**
   * The board's new cards in place: the marker comes back, holding off for the whole of the beat
   * the cards arriving spend, so the tree is drawn again only once they have landed.
   */
  private draw(): void {
    this.fade?.cancel();
    this.fade = this.host.nativeElement.animate(
      [{ opacity: 0 }, { opacity: this.painted() }],
      { duration: TREE_JOINT_FADE_MS, delay: TREE_JOINT_RETURN_DELAY_MS, easing: 'ease', fill: 'backwards' }
    );
  }

  /** What the marker is painted at, for a fade to leave from, or to come back to. */
  private painted(): string {
    return getComputedStyle(this.host.nativeElement).opacity;
  }
}
