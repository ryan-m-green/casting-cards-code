import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

/**
 * How long the whole change takes, in ms: a row's cards going out, and the new cards coming in.
 * Everything below is cut from this one figure, so the animation is this long however the three are
 * balanced against each other — retime it here, not in the rows that use it.
 */
const FADE_TOTAL_MS = 700;

/**
 * One half of that change, in ms: the cards leaving, and then — to the same measure — the cards
 * arriving. It is the window a row lets its cards lie before it swaps them (see `cardFadeWindowMs`),
 * and it is what a card's own fade and the beat it waits before it have to share between them.
 */
const FADE_PHASE_MS = FADE_TOTAL_MS / 2;

/** How long one card's fade takes, in ms — all of its coming in, and all of its going out. */
const FADE_MS = 150;

/**
 * How far a card's own fade may wander from `FADE_MS`, in ms, so that no two cards are fading
 * for quite the same length, and a row reads as separate cards rather than as one wash.
 */
const FADE_JITTER_MS = 30;

/**
 * The window, in ms, that a row's cards are scattered over: each card waits a random beat
 * within it before its fade begins. This is what gives a row its random pattern instead of one
 * block, and it is the room the fades leave in their half of the change — the last card to start
 * is this far behind the first, and is `FADE_MS + FADE_JITTER_MS` more in finishing, which is the
 * phase exactly.
 *
 * The three are read together: a card's fade runs between `FADE_MS - FADE_JITTER_MS` and
 * `FADE_MS + FADE_JITTER_MS`, and the beats take whatever the longest of those leaves of the
 * phase — so the phase is spent to the last millisecond, however the two are balanced. Give the
 * row a longer scatter by shortening `FADE_MS`; have it come in together by tightening this
 * towards 0.
 */
const FADE_STAGGER_MS = FADE_PHASE_MS - FADE_MS - FADE_JITTER_MS;

/** The viewer has asked for less movement: no fade is drawn anywhere. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * How long a row must let its cards lie before it swaps them for new ones, in ms: the window a
 * card may wait out plus the longest fade it may then run. That is the whole of the "out, then
 * in" order — the old cards are gone (or nearly) before the new ones appear, so the new ones are
 * laid out in a row the old ones have already left, and a Swiper re-centring a beat later counts
 * only the new cards.
 *
 * It is one half of `FADE_TOTAL_MS`, and the swap is what sets the other half going: the cards
 * arriving spend it the way the cards leaving spent this one.
 */
export function cardFadeWindowMs(): number {
  return prefersReducedMotion() ? 0 : FADE_STAGGER_MS + FADE_MS + FADE_JITTER_MS;
}

/**
 * How long a row's tree joints take to go, and — after the wait below — to be drawn again, in ms.
 *
 * A card's own fade wanders, by `FADE_JITTER_MS` and by a beat out of `FADE_STAGGER_MS`, so that a
 * row reads as separate cards rather than as one wash. A joint is not a card: the three marks under
 * the breadcrumb's card are one mark, and a row's tree has to move as one tree, so every joint of a
 * change is drawn and withdrawn to this one measure, from the same moment, with no jitter and no
 * stagger to drift them apart (see cc-tree-joint).
 *
 * It is `FADE_MS` — the measure of a single card's own fade — so the marks' going and coming are
 * cut from the same cloth as the cards whose tree they draw.
 */
export const TREE_JOINT_FADE_MS = FADE_MS;

/**
 * How long a row's tree joints hold off before they are drawn again, in ms: the whole of the half
 * of the change the cards arriving spend.
 *
 * A joint is withdrawn at the first moment of a change and drawn again at the last, so the marks
 * are never on the board beside a card that is arriving or leaving: the tree goes down before its
 * cards do, and is drawn again only once the new cards have landed.
 */
export const TREE_JOINT_RETURN_DELAY_MS = FADE_PHASE_MS;

/**
 * ccCardFade
 *
 * Gives a card its own fade in, and its own fade out — both drawn on the card's own element, so
 * neither can end up anywhere but where the card is.
 *
 * The whole of it — the cards of a row going out, the swap, and the new cards coming in — is
 * `FADE_TOTAL_MS`: each half of the change is spent by the fades and by the beats between them, so
 * a row is never mid-change for longer than that.
 *
 * Coming in: the card fades over `FADE_MS`, give or take `FADE_JITTER_MS`, after a random beat
 * of up to `FADE_STAGGER_MS`, so a row fills in as a scatter rather than as one block. The card
 * keeps its slot in the row the whole time (held invisible by `fill: 'backwards'`), so the row
 * never re-flows around the fade.
 *
 * Going out: the card fades out where it stands, the same way, once its row says so through
 * `ccCardFadeOut`. It has to be the row that says so, because a card cannot fade itself out as
 * it leaves: Angular takes a view's nodes out of the document *before* it runs their
 * `ngOnDestroy` (`destroyLView` calls `renderer.destroyNode` over the view's nodes, and only then
 * `cleanUpView` → `executeOnDestroys`), and a node that is no longer in the document cannot be
 * drawn on. Drawing a *copy* of the card was tried and taken back out: a copy is pinned where the
 * card stood when it was last measured, so it cannot follow the row as the row re-lays itself out
 * under it — a different set of cards, and a Swiper that re-centres a beat later — and the two
 * layouts read as cards fading out in scattered places.
 *
 * So the rows take their cards away in two steps instead (see `beginTransition` in the navigation
 * components): they raise `ccCardFadeOut` on every card of the row, let the cards fade, and only
 * then put the new cards in.
 *
 * A viewer who has asked for less movement gets no fades at all: cards simply come and go.
 */
@Directive({ selector: '[ccCardFade]', standalone: true })
export class CcCardFadeDirective implements OnInit {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** The viewer has asked for less movement: no fade is drawn (see the class doc). */
  private reducedMotion = prefersReducedMotion();

  /** The fade the card is arriving on, so that leaving can take it off the card. */
  private arrival: Animation | null = null;

  /** The fade the card is leaving on, so that a row putting it back can take it off. */
  private departure: Animation | null = null;

  /** The host's own inline hit-testing, to be put back once the card has come in. */
  private priorPointerEvents = '';

  /** Whether the card's row has asked it to fade out. */
  private outWanted = false;

  ngOnInit(): void {
    if (this.reducedMotion) return;

    const element = this.host.nativeElement;
    this.priorPointerEvents = element.style.pointerEvents;

    // A card born while its row is already taking its cards away is leaving, not arriving.
    if (!this.outWanted) {
      this.comeIn(element);
    }
  }

  /** The card's row taking its cards away, or putting this one back (see the class doc). */
  @Input()
  set ccCardFadeOut(wanted: boolean) {
    if (wanted === this.outWanted) return;

    this.outWanted = wanted;
    if (this.reducedMotion) return;

    if (wanted) {
      // Whatever the card was doing, it is leaving now: drop its arrival, then fade it where it
      // stands, from what it is actually being painted at to nothing.
      this.arrival?.cancel();
      this.arrival = null;
      this.hold(this.host.nativeElement);
      this.departure = this.host.nativeElement.animate(
        [{ opacity: this.opacityOf() }, { opacity: 0 }],
        { duration: this.duration(), delay: this.delay(), easing: 'ease', fill: 'forwards' }
      );
    } else {
      // The row kept this card after all: let it be seen and clicked again.
      this.departure?.cancel();
      this.departure = null;
      this.landed();
    }
  }

  /** The card comes in unseen and unclickable, so it is drawn from nothing but holds its slot. */
  private comeIn(element: HTMLElement): void {
    this.hold(element);
    this.arrival = element.animate(
      [{ opacity: 0 }, { opacity: this.opacityOf() }],
      { duration: this.duration(), delay: this.delay(), easing: 'ease', fill: 'backwards' }
    );
    this.arrival.finished.then(
      () => this.landed(),
      () => this.landed() // cancelled, because the card is leaving instead
    );
  }

  /** The card is only clickable once it can be seen, and only while it is staying. */
  private landed(): void {
    if (!this.outWanted) {
      this.host.nativeElement.style.pointerEvents = this.priorPointerEvents;
    }
  }

  /** For as long as a card cannot be seen, it is not a clickable card either. */
  private hold(element: HTMLElement): void {
    element.style.pointerEvents = 'none';
  }

  /** How long this card's fade takes, and how long it waits before it starts: its own wander. */
  private duration(): number {
    return Math.round(FADE_MS + (Math.random() * 2 - 1) * FADE_JITTER_MS);
  }

  private delay(): number {
    return Math.round(Math.random() * FADE_STAGGER_MS);
  }

  /** What the card is painted at, for a fade to come back to, or to leave from. */
  private opacityOf(): string {
    return getComputedStyle(this.host.nativeElement).opacity;
  }
}
