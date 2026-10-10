import {
  Component, ElementRef, HostListener, OnDestroy, computed, effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import { CampaignEncounter, EncounterCombatant } from '../../../../../core/encounter.service';
import { environment } from '../../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { PlayerCard, PlayerCardWithDetails } from '../../../../models/player-card.model';
import { combatantAsCast, combatantAsPlayer } from '../../../../../core/encounter-combatant.mapper';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcPlayerCardComponent } from '../../carddeck/cc-player-card/cc-player-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcSimplePlayerCardComponent } from '../../carddeck/cc-simple-player-card/cc-simple-player-card.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';

/** Where a spot sits on the ring, and everything the card(s) at that place need. */
interface RingSlot {
  spotId: string;
  /** The group's name: its own, or the name of the card leading it. */
  spotName: string;
  /** 1-based place on the ring, clockwise from the top: the top slot is 1. */
  position: number;
  /** Rolled initiative (duplicated across the group's rows); null = not rolled. */
  initiative: number | null;
  isPlayer: boolean;
  cards: EncounterCombatant[];
  /** Position on the circle, in percent of the circle box. */
  x: number;
  y: number;
  /** Extra offset, in pixels, pulling the card inward along its radius. */
  pullX: number;
  pullY: number;
  /**
   * Where the place marker sits, in pixels from the middle of the card — the same
   * distance in for every card, so the numbers ring the middle button evenly.
   */
  badgeX: number;
  badgeY: number;
}

/** A slot with the drag gesture painted on it. */
interface CircleNode extends RingSlot {
  /** What the node does while a group is held: rest, faded out, or under the pointer. */
  drag: 'idle' | 'hidden' | 'dragging';
  /** Where the card is drawn — its slot, or the pointer while it is the one held. */
  drawX: number;
  drawY: number;
}

/** A place a held group can be dropped on: one per slot of the ring. */
interface DropZone {
  index: number;
  spotId: string;
  x: number;
  y: number;
  pullX: number;
  pullY: number;
}

/** The drag gesture in flight: which group is held, and where the pointer has it. */
interface DragState {
  spotId: string;
  /** Slot the group came from, so a drop back on it changes nothing. */
  fromIndex: number;
  /** Pointer position, in percent of the circle box (where the card is drawn). */
  x: number;
  y: number;
  /** Slot under the pointer; null when the pointer is off the circle (that cancels). */
  overIndex: number | null;
}

/** What a click on the ring asks to look at: one place's cards, and the one pressed. */
export interface RingCombatantSelection {
  spotId: string;
  /** The group's name (its own, or its first card's). */
  spotName: string;
  cards: EncounterCombatant[];
  /** The card pressed within the stack: what the detail panels open on. */
  index: number;
}

/** Cards shown when a group holds more than one card (the rest is the count). */
const MAX_STACKED = 3;

/**
 * How much of a card is left showing when a group's cards are stacked: the card in front is whole, and
 * every card under it peeks this far out from under it. Measured in the same pixels whatever size the
 * cards are drawn at, so a group reads as one tight stack on a phone's face and on a wide one, where
 * the cards themselves are twice the size.
 */
const STACK_PEEK_PX = 12;

/**
 * How long a press must be held before the drag begins. Long enough that a card
 * is never picked up by accident — and, since a release before it is a click that
 * opens the card's detail drawer, long enough to tell the two gestures apart.
 */
const HOLD_MS = 500;

/** Pointer travel a release may still have moved and count as a click, not a drag. */
const CLICK_TOLERANCE_PX = 8;

/**
 * How long after the beam starts moving that the card it is heading for comes into the light. The
 * spotlight crosses the ring first and the card reads as coming under it, rather than the ring's
 * light switching on the instant the button is pressed.
 */
const HIGHLIGHT_DELAY_MS = 200;

/**
 * The footprint of a card as the ring draws it: the simple card's own 75×110, and the campaign's own
 * card at exactly twice that. Which of the two the ring measures with is the card it is holding (see
 * `cardWidth` / `cardHeight` and `largeCards`), and the place markers, the dropzones and the beam are
 * all built on it, so the ring stays true to whatever is drawn on it.
 */
const SIMPLE_CARD_WIDTH_PX = 75;
const SIMPLE_CARD_HEIGHT_PX = 110;
const LARGE_CARD_WIDTH_PX = 150;
const LARGE_CARD_HEIGHT_PX = 220;

/**
 * How much the cards are drawn down, by how many places the ring is holding: a handful of
 * groups read well at their own size, a crowded ring does not. Each entry is the number of
 * places the step starts at, and the last step reached wins — so 10 places still draw at
 * the 9-place size, and 12 or 13 at the 11-place one.
 *
 * A card's own size is never touched by this (see `cardWidth` / `cardHeight`): the step
 * scales the drawing, which changes nothing but the paint. These are the only numbers to
 * change for a different size.
 */
const CARD_SCALE_STEPS: readonly { places: number; scale: number }[] = [
  { places: 8, scale: 0.85 },
  { places: 9, scale: 0.75 },
  { places: 11, scale: 0.65 },
  { places: 14, scale: 0.55 },
];

/** How far a card's place marker sits clear of the card's drawn edge. */
const BADGE_GAP_PX = 24;

/**
 * The window width from which the ring draws the campaign's own cards rather than the simple ones
 * (see `largeCards`): the width the phone's own view ends at (see PHONE_VIEW), so every face that is
 * given the doubled ring is given the campaign's own cards with it — a tablet's 768px face reads the
 * campaign's real card faces rather than the simple ones — and the fit keeps them room on the ring
 * whichever of the two cards it is drawing (see the stylesheet's --circle-fit). The query asks for
 * `min-width` at this very figure, and a bound of that kind counts itself in.
 */
const LARGE_CARD_MIN_WIDTH = 768;

/**
 * The window height those cards need as well: the campaign's own card stands twice as tall as the
 * simple one (220 against 110), so on a face shorter than this the ring keeps the simple cards —
 * the tall ones would take the whole face and leave the ring nothing to be drawn on.
 */
const LARGE_CARD_MIN_HEIGHT = 600;

/**
 * How far a place marker sits in from the middle of a card drawn at the given size: the card's own
 * half-height — the larger half of its footprint, so the marker is clear of the card whichever way it
 * faces — with the crowding step on top of it, and then the gap the marker keeps off the card's edge.
 */
function badgeInset(cardHeight: number, scale: number): number {
  return (cardHeight / 2) * scale + BADGE_GAP_PX;
}

/**
 * cc-encounter-circle
 *
 * The encounter's spots laid out around a circle, starting at the top and running
 * clockwise in initiative order — exactly the order the server keeps for the
 * encounter. Each spot shows the card(s) it holds — the simple card, or the
 * campaign's own card at its own size where the face is wide enough for it (see
 * `largeCards`) — with its place on the ring on a badge, the top slot being 1, so
 * the DM reads the fight going around the ring.
 *
 * Nothing is placed on the ring until the fight is running: the circle is empty
 * until Start is pressed. While it runs, holding a group turns the ring into
 * dropzones — the other cards fade out and the held group follows the pointer —
 * and dropping it on one of them sets the encounter's new order, which the builder
 * saves.
 */
@Component({
  selector: 'cc-encounter-circle',
  standalone: true,
  imports: [CcCastCardComponent, CcPlayerCardComponent, CcSimpleCastCardComponent, CcSimplePlayerCardComponent, CcEditButtonComponent],
  templateUrl: './cc-encounter-circle.component.html',
  styleUrl: './cc-encounter-circle.component.scss'
})
export class CcEncounterCircleComponent implements OnDestroy {
  private http = inject(HttpClient);
  private shellSvc = inject(V2CampaignShellService);

  readonly encounter = input.required<CampaignEncounter>();
  readonly portalColor = input<string>('#6e28d0');
  readonly busy = input(false);

  /** The fight is running: the button offers to end it instead of starting it. */
  readonly isActive = computed(() => this.encounter().status === 'active');

  /** Asks the builder to start the encounter's initiative. */
  readonly startRequested = output<void>();
  /** Asks the builder to end the encounter. */
  readonly endRequested = output<void>();
  /** Asks the builder to open this encounter in the editor. */
  readonly editRequested = output<void>();
  /** Asks the builder to go back to the row of encounter cards. */
  readonly allRequested = output<void>();
  /** Asks the builder to move the turn marker on (the "Next" button). */
  readonly nextRequested = output<void>();
  /**
   * Asks the builder to open the card's detail panels (a click on a card, i.e. a
   * press released before the hold): the place's cards, and the one pressed.
   */
  readonly combatantSelected = output<RingCombatantSelection>();
  /**
   * Asks the builder to save a new ring order (a group was dragged to a new
   * place). The payload is the encounter's whole ring, clockwise from the top.
   */
  readonly reorderRequested = output<string[]>();

  /**
   * Distance of the card centres from the middle of the circle, as a percentage of its box, while the
   * face is drawn in the phone's own view. The ring is drawn on this very radius (the stylesheet
   * reads it as the --circle-radius custom property the template binds), so the line always runs
   * through the centre of the cards.
   */
  private static readonly PHONE_RADIUS = 42;

  /**
   * What that radius is multiplied by wherever the face is wider than a phone: 2 to begin with, so
   * the ring's radius — and with it its diameter — is doubled where there is room for it.
   *
   * The ring is measured as a percentage of the square it is drawn in, so a radius past 50% overhangs
   * that square by the difference: at 84% the cards sit 34% of the square outside it, which reaches
   * into the bands the builder keeps clear at the top and foot of the face (its action rows and the
   * shell's radial nav both live there). This is the number to tune if the ring reads too wide, and
   * the widest the ring may get is held separately — as the diameter itself — by the square's own
   * ceiling (see the stylesheet's --circle-diameter-max).
   */
  private static readonly WIDE_VIEW_RADIUS_FACTOR = 2;

  /**
   * The two views the face is drawn to, asked as a stylesheet would ask them: a phone, and a face with
   * room for the campaign's own cards — wide enough for them, and tall enough to hold them (see
   * LARGE_CARD_MIN_WIDTH / LARGE_CARD_MIN_HEIGHT).
   *
   * They are asked of the window's own media queries rather than of `window.innerWidth`, which is
   * only ever read at the moment it happens to be read. A tablet turned on its side or a window
   * dragged open matches its query once the browser has laid the change out, and every match is
   * reported the same way, while an `innerWidth` read can still catch the size a turn has left
   * behind. The phone's bound is the one the stylesheets use.
   */
  private static readonly PHONE_VIEW = '(max-width: 767px)';
  private static readonly WIDE_VIEW =
    `(min-width: ${LARGE_CARD_MIN_WIDTH}px) and (min-height: ${LARGE_CARD_MIN_HEIGHT}px)`;

  private readonly phoneView = window.matchMedia(CcEncounterCircleComponent.PHONE_VIEW);
  private readonly largeCardView = window.matchMedia(CcEncounterCircleComponent.WIDE_VIEW);

  /** Keeps both readings true to the window (registered in the constructor, dropped on destroy). */
  private readonly viewChangeListener = () => {
    this.isMobile.set(this.phoneView.matches);
    this.largeCards.set(this.largeCardView.matches);
  };

  /**
   * The viewport the face is drawn in. A phone is the one view the ring is kept at its own size
   * for; anything wider gets the doubled ring (see the two constants above).
   */
  readonly isMobile = signal(this.phoneView.matches);

  /**
   * The face has the room for the campaign's own cards rather than the simple ones (see the template):
   * the real faces — their frames, portraits and stars — at their own 150×220, in place of the 75×110
   * simple card. The room means both ways: a face wide enough for them and tall enough to hold them,
   * so a short, wide one (a phone on its side, a short window) keeps the simple cards.
   *
   * The ring's own shape does not change with the card, but everything measured around one does: the
   * slots, the dropzones, the place badges and the beam all follow the footprint `cardWidth` /
   * `cardHeight` report.
   */
  readonly largeCards = signal(this.largeCardView.matches);

  /**
   * The card the ring is drawing, in pixels: the simple card's own 75×110, or the campaign's own card
   * at its own 150×220 where the face is wide enough for it (see `largeCards`). The card is drawn at
   * exactly that size — never shrunk into a smaller frame — so the footprint is handed to the
   * stylesheet (as the --card-w / --card-h custom properties) and read back into the ring's own maths:
   * the place markers, the dropzones and the beam are all measured off the card actually on the ring.
   */
  readonly cardWidth = computed(() => this.largeCards() ? LARGE_CARD_WIDTH_PX : SIMPLE_CARD_WIDTH_PX);
  readonly cardHeight = computed(() => this.largeCards() ? LARGE_CARD_HEIGHT_PX : SIMPLE_CARD_HEIGHT_PX);

  /**
   * The widest group the encounter draws, in cards: what the ring has to find room for sideways. A
   * place's cards are drawn as a stack of at most MAX_STACKED of them — the rest is the count beside
   * them — so a group of a dozen reads the same as one of three. An encounter with no spots at all
   * asks for one card's room, which is what its empty ring would hold.
   */
  private readonly widestStack = computed(() => (this.encounter().spots ?? []).reduce(
    (widest, spot) => Math.max(widest, Math.min(spot.combatants.length, MAX_STACKED)),
    1
  ));

  /**
   * How far what the ring draws reaches out from the middle of a place, in pixels: half the widest
   * group's own width across — the card in front, plus the 12px of itself that every card under it
   * shows (see STACK_PEEK_PX) — and half a card's height down, both at the size the crowding step
   * draws them (see `cardScale`). A stack is centred on its place, so it stands the same distance
   * either way; a group's cards sit side by side, so the height is one card's however many it holds.
   *
   * The stylesheet reads both as the --ring-reach-x / --ring-reach-y custom properties, and holds the
   * ring's own size to them: it is the ring *and* what stands on it that has to fit the face, not the
   * ring alone (see the stylesheet's --circle-fit).
   */
  readonly ringReachX = computed(() => {
    // The stack's own width: the card in front, then every card under it showing its 12px of itself.
    const stack = this.cardWidth() + (this.widestStack() - 1) * STACK_PEEK_PX;

    return (stack / 2) * this.cardScale();
  });

  readonly ringReachY = computed(() => (this.cardHeight() / 2) * this.cardScale());

  /** Distance of the card centres from the middle of the circle, as a percentage of its box. */
  readonly radius = computed(() => this.isMobile()
    ? CcEncounterCircleComponent.PHONE_RADIUS
    : CcEncounterCircleComponent.PHONE_RADIUS * CcEncounterCircleComponent.WIDE_VIEW_RADIUS_FACTOR);

  /**
   * How far the ring and the cards keep inside that radius, in pixels. The cards
   * at 9 and 3 o'clock are the ones that reach the edge of the area, so the whole
   * ring is pulled in by this much — which nudges those cards inward without
   * taking them off the drawn line.
   */
  readonly ringInset = 4;

  constructor() {
    // Keeps the hand on the marker's place. The lookup runs untracked on purpose: the ring being
    // reordered must not count as the marker moving, so the hand is left exactly where it was until
    // the marker itself changes (the Next button, or a fight opened part-way through).
    effect(() => {
      const spotId = this.turnSpotId();
      const index = untracked(() => this.layout().findIndex(slot => slot.spotId === spotId));
      this.handIndex.set(index < 0 ? 0 : index);
    });

    // Moves the hand to the marker's place whenever the marker does, or the ring is re-shaped under
    // it. The move is worked out from the angle it is already on rather than from the place it stands
    // for: that is what turns the last place's next turn into a step on to the first, and what keeps
    // a reordered ring from stirring the hand at all (its angle is already where it belongs).
    effect(() => {
      const index = this.handIndex();
      const count = this.encounter().spots?.length ?? 0;
      if (count === 0) return;

      untracked(() => this.placeHand(index % count, count));
    });

    // The ring's own size and the cards it draws both turn on the view (see `isMobile`, `largeCards`).
    this.phoneView.addEventListener('change', this.viewChangeListener);
    this.largeCardView.addEventListener('change', this.viewChangeListener);

    // The party's own cards are read only where the ring will draw them (see `largeCards`).
    effect(() => { if (this.largeCards()) this.loadPlayerCards(); });
  }

  /**
   * How much the cards are drawn down on the ring, from how many places it is holding
   * (see CARD_SCALE_STEPS): full size while the ring is roomy, stepping down as it fills.
   */
  readonly cardScale = computed(() => {
    const places = this.encounter().spots?.length ?? 0;

    return CARD_SCALE_STEPS.reduce((scale, step) => (places >= step.places ? step.scale : scale), 1);
  });

  /** Middle of the ring, in percent of its box: the cards and the dropzones both
   *  measure their slots from here, so the two always agree. */
  private static readonly CENTRE_X = 50;
  private static readonly CENTRE_Y = 50;

  /** The circle's own box, so a pointer can be turned into a slot (see slotAt). */
  private readonly circleShapeRef = viewChild<ElementRef<HTMLElement>>('circleShape');

  /** The group being dragged, or null while the ring is at rest. */
  readonly drag = signal<DragState | null>(null);

  /**
   * The gesture in flight, from the press until the drop. A plain field: the
   * pointer handlers are the only ones reading it, never the template.
   */
  private gesture: {
    spotId: string;
    fromIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
    /** Timer of the hold that has not armed yet (0 once the drag has begun). */
    timer: number;
    dragging: boolean;
    /** The card the pointer was captured on, so the capture is always handed back. */
    captured: HTMLElement | null;
  } | null = null;

  /**
   * The card of the stack the pointer went down on, so a click opens the panels on
   * the card that was pressed rather than on the front of the group. A plain field:
   * the pointer handlers, not the template, are the ones reading it.
   */
  private pressedCard = 0;

  /**
   * The document-level pointer watchers of the gesture in flight, held as a closure
   * so the very functions that were added are the ones taken off again.
   */
  private gestureListeners: (() => void) | null = null;

  /**
   * The ring: one slot per spot, placed clockwise from the top. The cards and the
   * dropzones are both drawn from this, so a group dropped on a slot lands exactly
   * where its card then appears.
   */
  private readonly layout = computed<RingSlot[]>(() => {
    const spots = this.encounter().spots ?? [];
    const count = spots.length;
    // The place markers follow the cards in: a drawn card keeps the same gap to its number.
    const inset = badgeInset(this.cardHeight(), this.cardScale());

    return spots.map((spot, index) => {
      // -90deg is the top of the circle; adding the step walks clockwise. A lone
      // spot lands at the top (cos(-90) is 0), so the middle button stays clear.
      const angle = -90 + (360 / count) * index;
      const radians = (angle * Math.PI) / 180;
      const pull = this.ringInset;
      // Card to centre: the direction the place marker is placed along.
      const inward = { x: -Math.cos(radians), y: -Math.sin(radians) };

      return {
        spotId: spot.id,
        spotName: spot.groupName || spot.combatants[0]?.displayName || 'Group',
        position: index + 1,
        initiative: spot.combatants[0]?.initiativeNumber ?? null,
        isPlayer: spot.combatants.length > 0 && spot.combatants.every(card => card.combatantType === 'player'),
        cards: spot.combatants,
        x: CcEncounterCircleComponent.CENTRE_X + this.radius() * Math.cos(radians),
        y: CcEncounterCircleComponent.CENTRE_Y + this.radius() * Math.sin(radians),
        // Pulled inward along the radius, so a left or right card sits 4px in
        pullX: -pull * Math.cos(radians),
        pullY: -pull * Math.sin(radians),
        // The marker sits on the card's inner side, the same distance in from the card's
        // middle for every card: the numbers then ring the middle button evenly.
        badgeX: inward.x * inset,
        badgeY: inward.y * inset,
      };
    });
  });

  /**
   * The ring as the template draws it: the slots with the drag painted on them.
   * While a group is held every other card fades out, and the held one follows the
   * pointer instead of sitting on its slot.
   */
  readonly nodes = computed<CircleNode[]>(() => {
    const drag = this.drag();

    return this.layout().map(slot => {
      const held = drag && drag.spotId === slot.spotId ? drag : null;

      return {
        ...slot,
        drag: !drag ? 'idle' : held ? 'dragging' : 'hidden',
        drawX: held ? held.x : slot.x,
        drawY: held ? held.y : slot.y,
      };
    });
  });

  /** The places a held group can be dropped on: one dashed box per slot. */
  readonly dropzones = computed<DropZone[]>(() =>
    this.layout().map((slot, index) => ({
      index,
      spotId: slot.spotId,
      x: slot.x,
      y: slot.y,
      pullX: slot.pullX,
      pullY: slot.pullY,
    }))
  );

  /** True while a group is held: the ring has become a set of dropzones. */
  readonly isDragging = computed(() => this.drag() !== null);

  /**
   * The place whose card is lit: the one the beam is on, once it has had a beat to get there (see
   * HIGHLIGHT_DELAY_MS). Every other spot reads as out of the fight (see the stylesheet), so the
   * light trailing the beam is what tells the table whose turn it is.
   */
  readonly litPlace = signal(0);

  /** The pending arrival of the light, so a quick second turn replaces it rather than doubling it. */
  private lightTimer = 0;

  /** The slot the held group is over, or -1 when the pointer is off the ring. */
  readonly dropTarget = computed(() => this.drag()?.overIndex ?? -1);

  /**
   * The spot the server's turn marker is on. A computed of its own, so a change to
   * it means the marker really moved: reordering the ring hands the component a new
   * encounter object without touching this value, and that must not read as a turn
   * change.
   */
  private readonly turnSpotId = computed(() => this.encounter().currentSpotId);

  /**
   * Place on the ring the turn marker points at (0 = the top of the circle, 12:00),
   * drawn as the spotlight cone (see the stylesheet). The marker marks a *place*, not
   * the group standing on it: a group dragged to another place leaves it where it is —
   * the turn stays with the place it was taken on — and it only moves when the
   * server's marker moves.
   */
  private readonly handIndex = signal(0);

  /**
   * Where the turn marker points, in degrees clockwise from the top — an angle that
   * grows with the fight, so it only ever sweeps on. Leaving the last place for
   * the first is then one step past 12:00 rather than a wind back through every place
   * in between. An encounter whose turn has not been advanced yet points at 12:00, the
   * first place in initiative order.
   */
  readonly handRotation = signal(0);

  /** The place the hand was last put on, and how many places the ring had then. */
  private handPlacedAt: { place: number; count: number } | null = null;

  /** Puts the hand on a place, turning the marker's move into an angle to sweep through. */
  private placeHand(place: number, count: number): void {
    const target = (360 / count) * place;
    const from = this.handPlacedAt;
    const current = this.handRotation();

    // The first placement is simply where the marker is: there is nothing to move from, so the card
    // standing there is lit at once — no beam is on its way for the light to wait on.
    if (!from) {
      this.handRotation.set(target);
      this.handPlacedAt = { place, count };
      this.lightPlace(place, 0);
      return;
    }

    const on = (((target - current) % 360) + 360) % 360; // clockwise, from here to there
    const forward = from.count === count && place === (from.place + 1) % count;
    const backward = from.count === count && place === (from.place - 1 + count) % count;

    // A turn being taken on steps the hand on, clockwise. Anything else (a fight opened
    // part-way through, a place added or removed under the hand) takes the short way.
    const delta = forward ? on : backward ? on - 360 : CcEncounterCircleComponent.shortestTurn(on);

    this.handRotation.set(current + delta);
    this.handPlacedAt = { place, count };
    this.lightPlace(place, HIGHLIGHT_DELAY_MS);
  }

  /**
   * Brings the card at a place into the light, the beam leading it by the given delay. A hand that did
   * not move (a re-ordered ring, a re-read of the same turn) asks for the place already lit, and a
   * signal set to the value it already holds paints nothing, so nothing stirs. A second turn landing
   * before the first light does replaces it, so the light never runs behind the fight.
   */
  private lightPlace(place: number, delay: number): void {
    window.clearTimeout(this.lightTimer);

    if (delay === 0) {
      this.litPlace.set(place);
      return;
    }

    this.lightTimer = window.setTimeout(() => this.litPlace.set(place), delay);
  }

  /**
   * The way round from an angle, signed: never more than half a turn, so it is the
   * shorter of the two, and a hair of floating-point drift never reads as a full turn.
   */
  private static shortestTurn(clockwise: number): number {
    return clockwise <= 180 ? clockwise : clockwise - 360;
  }

  /** The three cards of a group that are drawn (the rest is the +n badge). */
  stacked(node: CircleNode): EncounterCombatant[] {
    return node.cards.slice(0, MAX_STACKED);
  }

  /**
   * Left offset for a card of a group: the card in front sits flush, and every card under it is pulled
   * back by all but the 12px of itself that stays showing (see STACK_PEEK_PX), so a group reads as one
   * tight stack of cards rather than a fan, whether the ring is drawing the simple card or the
   * campaign's own — the offset follows the card's own width rather than a fixed number.
   */
  stackOffset(index: number): number {
    return index === 0 ? 0 : STACK_PEEK_PX - this.cardWidth();
  }

  /**
   * A combatant as the simple cast card wants it (see the shared mapper: the
   * campaign's cast instance supplies the card face when the cast is one of them).
   */
  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.encounter().campaignId, this.shellSvc.campaign()?.casts ?? []);
  }

  /** A party member as the simple player card wants it. */
  asPlayer(combatant: EncounterCombatant): PlayerCard {
    return combatantAsPlayer(combatant, this.encounter().campaignId);
  }

  /**
   * A party member as the campaign's own player card, where the face is drawing those (see
   * `largeCards`). The ring's player rows are the encounter's own (name, portrait, hit points),
   * while the full card wants the member's card behind them — the card the row was made from, which
   * carries its conditions, purse and traits.
   *
   * Null while that read is in the air, and where the campaign no longer holds the card: the
   * template falls back to the simple card then, so a place on the ring is never drawn empty.
   */
  asPlayerCard(combatant: EncounterCombatant): PlayerCardWithDetails | null {
    const cardId = combatant.playerCardId;
    if (!cardId) return null;

    return this.playerCards().find(card => card.id === cardId) ?? null;
  }

  /** The campaign's own player cards, read for the ring's party members (see `asPlayerCard`). */
  private readonly playerCards = signal<PlayerCardWithDetails[]>([]);
  private loadingPlayerCards = false;

  /**
   * Reads the campaign's player cards, once, and only where the ring will draw them: a simple party
   * card is made from the encounter's own row, so the face that draws those never asks for them.
   * A read that fails leaves the simple cards standing rather than showing an error on the ring.
   */
  private loadPlayerCards(): void {
    if (this.playerCards().length || this.loadingPlayerCards) return;
    this.loadingPlayerCards = true;

    this.http.get<PlayerCardWithDetails[]>(
      `${environment.apiUrl}/api/campaigns/${this.encounter().campaignId}/player-cards`
    ).subscribe({
      next: cards => {
        this.loadingPlayerCards = false;
        this.playerCards.set(cards ?? []);
      },
      error: () => { this.loadingPlayerCards = false; },
    });
  }

  // ── Drag and drop: holding a group sets the encounter's order ─────────────

  /**
   * A press on a card starts the gesture. Nothing on the ring changes yet: the drag
   * is armed by the hold alone (see HOLD_MS), so a press the DM lets go of is a
   * click — which is what opens the card's detail panels.
   */
  onNodePointerDown(event: PointerEvent, node: CircleNode): void {
    // A press supersedes any gesture that is not a drag already on screen: a gesture
    // whose release never reached us must never be able to lock the ring. A drag in
    // flight is left alone, unless the press comes from that very pointer — which
    // means that drag is over too.
    const held = this.gesture;
    if (held && (!held.dragging || held.pointerId === event.pointerId)) this.clearGesture();

    // One gesture at a time, never while a write is in flight, and only on a ring
    // that has somewhere to move to.
    if (this.busy() || this.gesture || this.layout().length < 2) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const card = event.currentTarget as HTMLElement | null;
    this.capturePointer(card, event.pointerId);

    // The press paints nothing of its own; preventing the default also keeps the
    // menu a long press raises (on touch) from covering the dropzones.
    event.preventDefault();

    this.listenForGesture();

    this.gesture = {
      spotId: node.spotId,
      fromIndex: node.position - 1,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer: window.setTimeout(() => this.beginDrag(), HOLD_MS),
      dragging: false,
      captured: card,
    };
  }

  /** Which card of a stack the pointer went down on (a click opens the panels on it). */
  onCardPressed(index: number): void {
    this.pressedCard = index;
  }

  /** A native card/image drag would swallow the gesture: it is never wanted here. */
  onNodeDragStart(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Carries the held card with the pointer and marks the slot underneath it.
   *
   * Watched on the document rather than on the card: the pointer leaving the card
   * (or the ring) must still move the ghost, and the end of the gesture has to be
   * caught wherever it happens — a gesture bound to a card sits there unheard if the
   * release is delivered anywhere else.
   */
  private onPointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    // Until the hold arms the drag there is nothing to carry: the press is still a
    // press, and moving it must not pick the card up.
    if (!gesture.dragging) return;

    const point = this.pointInPercent(event.clientX, event.clientY);
    if (!point) return; // the ring has not been laid out: there is nowhere to draw it

    this.drag.set({
      spotId: gesture.spotId,
      fromIndex: gesture.fromIndex,
      x: point.x,
      y: point.y,
      // Off the ring there is no slot to be over, which is what cancels a drop.
      overIndex: this.slotAt(event.clientX, event.clientY),
    });
  }

  /**
   * The release: either the drop of a held group, or — when the hold never armed it
   * and the pointer stayed put — a click on the card, which the builder turns into
   * the detail drawer.
   */
  private onPointerUp(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const travel = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    const clicked = !gesture.dragging && travel <= CLICK_TOLERANCE_PX;

    // However the drop goes — a write that throws included — the gesture is over:
    // nothing may be left behind that would refuse the next press.
    try {
      if (gesture.dragging) this.dropGroup();
      else if (clicked) this.selectCard(gesture.spotId);
    } finally {
      this.clearGesture();
    }
  }

  /** A click on a card: the place it stands at, and the card of the stack pressed. */
  private selectCard(spotId: string): void {
    const slot = this.layout().find(entry => entry.spotId === spotId);
    if (!slot) return;

    const index = Math.min(Math.max(this.pressedCard, 0), Math.max(slot.cards.length - 1, 0));

    this.combatantSelected.emit({
      spotId,
      spotName: slot.spotName,
      cards: slot.cards,
      index,
    });
  }

  /** The browser took the gesture away (a system swipe, a lost pointer): nothing moves. */
  private onPointerCancel(event: PointerEvent): void {
    if (this.gesture?.pointerId !== event.pointerId) return;
    this.clearGesture();
  }

  /** The menu a long press raises on touch would cover the dropzones: suppress it. */
  onNodeContextMenu(event: MouseEvent): void {
    if (this.gesture) event.preventDefault();
  }

  /** Escape abandons a drag, so a drop never happens by accident. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.gesture) this.clearGesture();
  }

  ngOnDestroy(): void {
    this.phoneView.removeEventListener('change', this.viewChangeListener);
    this.largeCardView.removeEventListener('change', this.viewChangeListener);
    window.clearTimeout(this.lightTimer);
    this.clearGesture();
  }

  // ── The gesture itself ────────────────────────────────────────────────────

  /**
   * The hold has been carried through: the other cards fade out and the dropzones
   * appear (the template draws those from drag()), so every place the group can go
   * is on the ring at once. The held card follows the pointer from here on,
   * starting where the card stands — the press itself has not moved it.
   */
  private beginDrag(at?: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture) return;

    // The ring is only draggable while the fight is running, and never while a
    // write is in flight.
    const slot = this.busy() || !this.isActive()
      ? null
      : this.layout().find(entry => entry.spotId === gesture.spotId);

    if (!slot) {
      this.clearGesture();
      return;
    }

    // The hold timer may still be armed when a moving press arms the drag first.
    if (gesture.timer) window.clearTimeout(gesture.timer);
    gesture.timer = 0;
    gesture.dragging = true;

    const point = at ? this.pointInPercent(at.clientX, at.clientY) : null;

    this.drag.set({
      spotId: gesture.spotId,
      fromIndex: gesture.fromIndex,
      x: point?.x ?? slot.x,
      y: point?.y ?? slot.y,
      overIndex: at ? this.slotAt(at.clientX, at.clientY) : gesture.fromIndex,
    });
  }

  /**
   * Hands the new order to the builder: the group is lifted out of the ring and
   * put back in the slot it was dropped on, with everything between the two
   * shifting one place. A drop back on its own slot — or off the ring — is no
   * change at all, so nothing is written.
   */
  private dropGroup(): void {
    const drag = this.drag();
    if (!drag || drag.overIndex === null || drag.overIndex === drag.fromIndex) return;

    const order = this.layout().map(slot => slot.spotId);
    const [moved] = order.splice(drag.fromIndex, 1);
    order.splice(drag.overIndex, 0, moved);

    this.reorderRequested.emit(order);
  }

  /**
   * Watches the pointer for exactly as long as the gesture lasts.
   *
   * Added by hand rather than bound in the template: a document binding would make
   * Angular run change detection on every pointer move for as long as the face is
   * mounted, while the ring only cares about the moves between a press and its
   * release. That release is the point of it: caught out here, a pointer lifted off
   * the card — or off the window — always ends the gesture, so a stale one can never
   * leave the ring unable to be grabbed.
   */
  private listenForGesture(): void {
    if (this.gestureListeners) return;

    const move = (event: PointerEvent) => this.onPointerMove(event);
    const up = (event: PointerEvent) => this.onPointerUp(event);
    const cancel = (event: PointerEvent) => this.onPointerCancel(event);

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);

    this.gestureListeners = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
    };
  }

  private stopListeningForGesture(): void {
    this.gestureListeners?.();
    this.gestureListeners = null;
  }

  /** Abandons the gesture (a drop, a cancel, a stray touch): the cards fade back in. */
  private clearGesture(): void {
    this.stopListeningForGesture();

    const gesture = this.gesture;
    if (!gesture) return;

    if (gesture.timer) window.clearTimeout(gesture.timer);
    // Hand the pointer back, so nothing is left captured by a card that may have
    // moved on since (the ring is reordered the moment a group is dropped).
    this.releasePointer(gesture.captured, gesture.pointerId);
    this.gesture = null;
    this.drag.set(null);
  }

  // ── Turning a pointer into a place on the ring ────────────────────────────

  /**
   * A client point as a place in the circle's box, in percent, clamped to the box so
   * that a card carried past the edge is still drawn on the ring. Null only when the
   * box has not been laid out (or is not on screen) yet.
   */
  private pointInPercent(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.circleShapeRef()?.nativeElement.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;

    return {
      x: Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100),
      y: Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100),
    };
  }

  /**
   * The slot the pointer is nearest, read straight off its angle from the middle of
   * the ring: 0 is the top and the slots run clockwise every 360/n degrees. Null
   * when the pointer is off the circle — dropping there leaves the order alone.
   */
  private slotAt(clientX: number, clientY: number): number | null {
    const box = this.circleShapeRef()?.nativeElement;
    const count = this.layout().length;
    if (!box || count < 2) return null;

    const rect = box.getBoundingClientRect();
    if (!rect.width || !rect.height || !this.insideBox(rect, clientX, clientY)) return null;

    const centreX = rect.left + (CcEncounterCircleComponent.CENTRE_X / 100) * rect.width;
    const centreY = rect.top + (CcEncounterCircleComponent.CENTRE_Y / 100) * rect.height;
    const degrees = (Math.atan2(clientY - centreY, clientX - centreX) * 180) / Math.PI;
    const step = 360 / count;
    const fromTop = (((degrees + 90) % 360) + 360) % 360;

    return Math.round(fromTop / step) % count;
  }

  private insideBox(rect: DOMRect, clientX: number, clientY: number): boolean {
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  private capturePointer(el: HTMLElement | null, pointerId: number): void {
    try {
      el?.setPointerCapture?.(pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
  }

  private releasePointer(el: HTMLElement | null, pointerId: number): void {
    try {
      if (el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
  }
}
