import {
  Component, ElementRef, HostListener, OnInit, OnDestroy, computed, effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignEncounter, EncounterCombatant } from '../../../../../core/encounter.service';
import { EncounterCelebrationService } from '../../../../../core/encounter-celebration.service';
import { environment } from '../../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CardCondition } from '../../../../models/condition.model';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { ConditionAssignedEvent, ConditionRemovedEvent, PlayerCard, PlayerCardWithDetails } from '../../../../models/player-card.model';
import { combatantAsCast, combatantAsPlayer, isCombatantOutOfTheFight } from '../../../../../core/encounter-combatant.mapper';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CcCastCardComponent } from '../../../Shared/cc-cast-card/cc-cast-card.component';
import { CcPlayerCardComponent } from '../../carddeck/cc-player-card/cc-player-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcSimplePlayerCardComponent } from '../../carddeck/cc-simple-player-card/cc-simple-player-card.component';
import { CcEncounterControlsComponent } from '../cc-encounter-controls/cc-encounter-controls.component';
import { CcRingConditionComponent } from '../cc-ring-condition/cc-ring-condition.component';

interface RingSlot {
  spotId: string;
  spotName: string;
  position: number;
  initiative: number | null;
  isPlayer: boolean;
  cards: EncounterCombatant[];
  x: number;
  y: number;
  pullX: number;
  pullY: number;
  badgeX: number;
  badgeY: number;
}

interface CircleNode extends RingSlot {
  drag: 'idle' | 'hidden' | 'dragging';
  drawX: number;
  drawY: number;
  arriving: boolean;
  dealDelay: number;
}

interface DropZone {
  index: number;
  spotId: string;
  x: number;
  y: number;
  pullX: number;
  pullY: number;
}

interface DragState {
  spotId: string;
  fromIndex: number;
  x: number;
  y: number;
  overIndex: number | null;
}

export interface RingCombatantSelection {
  spotId: string;
  spotName: string;
  cards: EncounterCombatant[];
  index: number;
}

interface StandbyArc {
  topId: string;
  bottomId: string;
  topPath: string;
  bottomPath: string;
  top: string;
  bottom: string;
  fontSize: number;
}

const MAX_STACKED = 3;

const STACK_PEEK_PX = 12;

const HOLD_MS = 500;

const CLICK_TOLERANCE_PX = 8;

const HIGHLIGHT_DELAY_MS = 200;

const SIMPLE_CARD_WIDTH_PX = 75;
const SIMPLE_CARD_HEIGHT_PX = 110;
const LARGE_CARD_WIDTH_PX = 150;
const LARGE_CARD_HEIGHT_PX = 220;

const CARD_SCALE_STEPS: readonly { places: number; scale: number }[] = [
  { places: 8, scale: 0.85 },
  { places: 9, scale: 0.75 },
  { places: 11, scale: 0.65 },
  { places: 14, scale: 0.55 },
];

const BADGE_GAP_PX = 24;

const STANDBY_VIEW = 100;

const STANDBY_GAP = 2;

const STANDBY_MAX_FONT = 16;

const STANDBY_CHAR_RATIO = 0.8;

const STANDBY_MARKER = '...';

const DEAL_LEAD_MS = 120;

const DEAL_STAGGER_MS = 150;

const LARGE_CARD_MIN_WIDTH = 801;

const LARGE_CARD_MIN_HEIGHT = 801;

function badgeInset(cardHeight: number, scale: number): number {
  return (cardHeight / 2) * scale + BADGE_GAP_PX;
}

@Component({
  selector: 'cc-encounter-circle',
  standalone: true,
  imports: [CcCastCardComponent, CcPlayerCardComponent, CcSimpleCastCardComponent, CcSimplePlayerCardComponent, CcEncounterControlsComponent, CcRingConditionComponent],
  templateUrl: './cc-encounter-circle.component.html',
  styleUrl: './cc-encounter-circle.component.scss'
})
export class CcEncounterCircleComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);
  private hub = inject(CampaignHubService);
  private conditionsApi = inject(CardConditionService);

  private readonly subs = new Subscription();

  private readonly conditionOverrides = signal<Map<string, CardCondition[]>>(new Map());

  readonly encounter = input.required<CampaignEncounter>();
  readonly portalColor = input<string>('#6e28d0');
  readonly busy = input(false);

  readonly readOnly = input(false);
  readonly standby = input(false);
  readonly standbyMessage = input('');

  readonly celebration = inject(EncounterCelebrationService);

  private static standbyIds = 0;

  private readonly standbyTopId = `standby-top-${++CcEncounterCircleComponent.standbyIds}`;

  private readonly standbyBottomId = `standby-bottom-${++CcEncounterCircleComponent.standbyIds}`;

  readonly standbyArc = computed<StandbyArc | null>(() => {
    const message = this.standbyMessage().trim();
    if (!message) return null;

    const [top, bottom] = CcEncounterCircleComponent.splitStandby(message);

    const inner = STANDBY_VIEW - STANDBY_GAP;

    let font = STANDBY_MAX_FONT;
    const topRadius = () => inner - font * 0.75;

    font = Math.min(
      font,
      (Math.PI * topRadius()) / (Math.max(top.length, 1) * STANDBY_CHAR_RATIO),
      (Math.PI * inner) / (Math.max(bottom.length, 1) * STANDBY_CHAR_RATIO));

    const radiusTop = topRadius();
    const radiusBottom = inner;
    const centre = STANDBY_VIEW;

    const arc = (radius: number, sweep: number) =>
      `M ${centre - radius},${centre} A ${radius},${radius} 0 0 ${sweep} ${centre + radius},${centre}`;

    return {
      topId: this.standbyTopId,
      bottomId: this.standbyBottomId,
      topPath: arc(radiusTop, 1),
      bottomPath: arc(radiusBottom, 0),
      top,
      bottom,
      fontSize: font,
    };
  });

  readonly arrivals = input<readonly string[]>([]);

  readonly isActive = computed(() => this.encounter().status === 'active');

  readonly ringVisible = computed(() => this.isActive() || this.standby());

  readonly endRequested = output<void>();
  readonly editRequested = output<void>();
  readonly allRequested = output<void>();
  readonly nextRequested = output<void>();
  readonly combatantSelected = output<RingCombatantSelection>();
  readonly reorderRequested = output<string[]>();

  private static readonly PHONE_RADIUS = 42;

  private static readonly WIDE_VIEW_RADIUS = 50;

  private static readonly PHONE_VIEW = '(max-width: 767px)';
  private static readonly WIDE_VIEW =
    `(min-width: ${LARGE_CARD_MIN_WIDTH}px) and (min-height: ${LARGE_CARD_MIN_HEIGHT}px)`;

  private readonly phoneView = window.matchMedia(CcEncounterCircleComponent.PHONE_VIEW);
  private readonly largeCardView = window.matchMedia(CcEncounterCircleComponent.WIDE_VIEW);

  private readonly viewChangeListener = () => {
    this.isMobile.set(this.phoneView.matches);
    this.wideView.set(this.largeCardView.matches);
  };

  readonly isMobile = signal(this.phoneView.matches);

  private readonly wideView = signal(this.largeCardView.matches);

  readonly largeCards = computed(() => this.wideView() && !this.readOnly());

  readonly cardWidth = computed(() => this.largeCards() ? LARGE_CARD_WIDTH_PX : SIMPLE_CARD_WIDTH_PX);
  readonly cardHeight = computed(() => this.largeCards() ? LARGE_CARD_HEIGHT_PX : SIMPLE_CARD_HEIGHT_PX);

  private readonly widestStack = computed(() => (this.encounter().spots ?? []).reduce(
    (widest, spot) => Math.max(widest, Math.min(spot.combatants.length, MAX_STACKED)),
    1
  ));

  readonly ringReachX = computed(() => {
    const stack = this.cardWidth() + (this.widestStack() - 1) * STACK_PEEK_PX;

    return (stack / 2) * this.cardScale();
  });

  readonly ringReachY = computed(() => (this.cardHeight() / 2) * this.cardScale());

  readonly radius = computed(() => this.isMobile()
    ? CcEncounterCircleComponent.PHONE_RADIUS
    : CcEncounterCircleComponent.WIDE_VIEW_RADIUS);

  readonly ringInset = 4;

  constructor() {
    effect(() => {
      this.encounter().id;
      untracked(() => this.conditionOverrides.set(new Map()));
    });

    effect(() => {
      const spotId = this.turnSpotId();
      const index = untracked(() => this.layout().findIndex(slot => slot.spotId === spotId));
      this.handIndex.set(index < 0 ? 0 : index);
    });

    effect(() => {
      const index = this.handIndex();
      const count = this.encounter().spots?.length ?? 0;
      if (count === 0) return;

      untracked(() => this.placeHand(index % count, count));
    });

    this.phoneView.addEventListener('change', this.viewChangeListener);
    this.largeCardView.addEventListener('change', this.viewChangeListener);

    effect(() => { if (this.largeCards()) this.loadPlayerCards(); });
  }

  ngOnInit(): void {
    this.subs.add(this.hub.on('ConditionAssigned', 'cc-encounter-circle', event => this.refreshConditions(event)));
    this.subs.add(this.hub.on('ConditionRemoved', 'cc-encounter-circle', event => this.refreshConditions(event)));
  }

  readonly cardScale = computed(() => {
    const places = this.encounter().spots?.length ?? 0;

    return CARD_SCALE_STEPS.reduce((scale, step) => (places >= step.places ? step.scale : scale), 1);
  });

  private static readonly CENTRE_X = 50;
  private static readonly CENTRE_Y = 50;

  private readonly circleShapeRef = viewChild<ElementRef<HTMLElement>>('circleShape');

  readonly drag = signal<DragState | null>(null);

  private gesture: {
    spotId: string;
    fromIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
    dragging: boolean;
    captured: HTMLElement | null;
  } | null = null;

  private pressedCard = 0;

  private gestureListeners: (() => void) | null = null;

  private readonly layout = computed<RingSlot[]>(() => {
    const spots = this.encounter().spots ?? [];
    const count = spots.length;
    const inset = badgeInset(this.cardHeight(), this.cardScale());

    return spots.map((spot, index) => {
      const angle = -90 + (360 / count) * index;
      const radians = (angle * Math.PI) / 180;
      const pull = this.ringInset;
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
        pullX: -pull * Math.cos(radians),
        pullY: -pull * Math.sin(radians),
        badgeX: inward.x * inset,
        badgeY: inward.y * inset,
      };
    });
  });

  readonly nodes = computed<CircleNode[]>(() => {
    const drag = this.drag();
    const arrivals = new Map(this.arrivals().map(
      (spotId, index): [string, number] => [spotId, DEAL_LEAD_MS + index * DEAL_STAGGER_MS]
    ));

    return this.layout().map(slot => {
      const held = drag && drag.spotId === slot.spotId ? drag : null;
      const dealDelay = arrivals.get(slot.spotId);

      return {
        ...slot,
        drag: !drag ? 'idle' : held ? 'dragging' : 'hidden',
        drawX: held ? held.x : slot.x,
        drawY: held ? held.y : slot.y,
        arriving: dealDelay !== undefined,
        dealDelay: dealDelay ?? 0,
      };
    });
  });

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

  readonly isDragging = computed(() => this.drag() !== null);

  readonly litPlace = signal(0);

  private lightTimer = 0;

  readonly dropTarget = computed(() => this.drag()?.overIndex ?? -1);

  private readonly turnSpotId = computed(() => this.encounter().currentSpotId);

  private readonly handIndex = signal(0);

  readonly handRotation = signal(0);

  private handPlacedAt: { place: number; count: number } | null = null;

  private placeHand(place: number, count: number): void {
    const target = (360 / count) * place;
    const from = this.handPlacedAt;
    const current = this.handRotation();

    if (!from) {
      this.handRotation.set(target);
      this.handPlacedAt = { place, count };
      this.lightPlace(place, 0);
      return;
    }

    const on = (((target - current) % 360) + 360) % 360;
    const forward = from.count === count && place === (from.place + 1) % count;
    const backward = from.count === count && place === (from.place - 1 + count) % count;

    const delta = forward ? on : backward ? on - 360 : CcEncounterCircleComponent.shortestTurn(on);

    this.handRotation.set(current + delta);
    this.handPlacedAt = { place, count };
    this.lightPlace(place, HIGHLIGHT_DELAY_MS);
  }

  private lightPlace(place: number, delay: number): void {
    window.clearTimeout(this.lightTimer);

    if (delay === 0) {
      this.litPlace.set(place);
      return;
    }

    this.lightTimer = window.setTimeout(() => this.litPlace.set(place), delay);
  }

  private static shortestTurn(clockwise: number): number {
    return clockwise <= 180 ? clockwise : clockwise - 360;
  }

  private static splitStandby(message: string): [string, string] {
    const marker = message.indexOf(STANDBY_MARKER);

    if (marker >= 0) {
      const cut = marker + STANDBY_MARKER.length;
      return [message.slice(0, cut).trim(), message.slice(cut).trim()];
    }

    const middle = Math.ceil(message.length / 2);
    const space = message.indexOf(' ', middle);
    const at = space < 0 ? middle : space;

    return [message.slice(0, at).trim(), message.slice(at).trim()];
  }

  stacked(node: CircleNode): EncounterCombatant[] {
    const unaffected = node.cards.filter(card => !isCombatantOutOfTheFight(card));
    const affected = node.cards.filter(card => isCombatantOutOfTheFight(card));

    return [...unaffected, ...affected].slice(0, MAX_STACKED);
  }

  stackOffset(index: number): number {
    return index === 0 ? 0 : STACK_PEEK_PX - this.cardWidth();
  }

  conditionsFor(combatant: EncounterCombatant): CardCondition[] {
    const read = this.conditionOverrides().get(combatant.id);
    if (read) return read;

    return (combatant.conditions ?? []).map(name => ({
      id: name,
      conditionName: name,
      assignedAt: '',
    }));
  }

  private refreshConditions(event: ConditionAssignedEvent | ConditionRemovedEvent | null): void {
    if (!event) return;

    const combatant = (this.encounter().spots ?? [])
      .flatMap(spot => spot.combatants)
      .find(entry => entry.id === event.combatantId
        || (!!entry.playerCardId && entry.playerCardId === event.playerCardId));

    if (!combatant) return;

    this.conditionsApi.load(this.encounter().campaignId, this.subjectFor(combatant)).subscribe({
      next: conditions => this.conditionOverrides.update(read => new Map(read).set(combatant.id, conditions)),
    });
  }

  subjectFor(combatant: EncounterCombatant): ConditionSubject {
    return combatant.playerCardId
      ? { kind: 'player', playerCardId: combatant.playerCardId }
      : { kind: 'combatant', encounterId: combatant.encounterId, combatantId: combatant.id };
  }

  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.encounter().campaignId, this.shellSvc.campaign()?.casts ?? []);
  }

  asPlayer(combatant: EncounterCombatant): PlayerCard {
    return combatantAsPlayer(combatant, this.encounter().campaignId);
  }

  asPlayerCard(combatant: EncounterCombatant): PlayerCardWithDetails | null {
    const cardId = combatant.playerCardId;
    if (!cardId) return null;

    return this.playerCards().find(card => card.id === cardId) ?? null;
  }

  private readonly playerCards = signal<PlayerCardWithDetails[]>([]);
  private loadingPlayerCards = false;

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

  onNodePointerDown(event: PointerEvent, node: CircleNode): void {
    const held = this.gesture;
    if (held && (!held.dragging || held.pointerId === event.pointerId)) this.clearGesture();

    if (this.busy() || this.gesture || this.layout().length < 2) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const card = event.currentTarget as HTMLElement | null;
    this.capturePointer(card, event.pointerId);

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

  onCardPressed(node: CircleNode, card: EncounterCombatant): void {
    this.pressedCard = Math.max(node.cards.findIndex(entry => entry.id === card.id), 0);
  }

  onNodeDragStart(event: DragEvent): void {
    event.preventDefault();
  }

  private onPointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (!gesture.dragging) return;

    const point = this.pointInPercent(event.clientX, event.clientY);
    if (!point) return;

    this.drag.set({
      spotId: gesture.spotId,
      fromIndex: gesture.fromIndex,
      x: point.x,
      y: point.y,
      overIndex: this.slotAt(event.clientX, event.clientY),
    });
  }

  private onPointerUp(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const travel = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    const clicked = !gesture.dragging && travel <= CLICK_TOLERANCE_PX;

    try {
      if (gesture.dragging) this.dropGroup();
      else if (clicked) this.selectCard(gesture.spotId);
    } finally {
      this.clearGesture();
    }
  }

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

  private onPointerCancel(event: PointerEvent): void {
    if (this.gesture?.pointerId !== event.pointerId) return;
    this.clearGesture();
  }

  onNodeContextMenu(event: MouseEvent): void {
    if (this.gesture) event.preventDefault();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.gesture) this.clearGesture();
  }

  ngOnDestroy(): void {
    this.phoneView.removeEventListener('change', this.viewChangeListener);
    this.largeCardView.removeEventListener('change', this.viewChangeListener);
    window.clearTimeout(this.lightTimer);
    this.clearGesture();
    this.subs.unsubscribe();
  }

  private beginDrag(at?: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture) return;

    if (this.readOnly()) return;

    const slot = this.busy() || !this.isActive()
      ? null
      : this.layout().find(entry => entry.spotId === gesture.spotId);

    if (!slot) {
      this.clearGesture();
      return;
    }

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

  private dropGroup(): void {
    const drag = this.drag();
    if (!drag || drag.overIndex === null || drag.overIndex === drag.fromIndex) return;

    const order = this.layout().map(slot => slot.spotId);
    const [moved] = order.splice(drag.fromIndex, 1);
    order.splice(drag.overIndex, 0, moved);

    this.reorderRequested.emit(order);
  }

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

  private clearGesture(): void {
    this.stopListeningForGesture();

    const gesture = this.gesture;
    if (!gesture) return;

    if (gesture.timer) window.clearTimeout(gesture.timer);
    this.releasePointer(gesture.captured, gesture.pointerId);
    this.gesture = null;
    this.drag.set(null);
  }

  private pointInPercent(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.circleShapeRef()?.nativeElement.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;

    return {
      x: Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100),
      y: Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100),
    };
  }

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
    }
  }

  private releasePointer(el: HTMLElement | null, pointerId: number): void {
    try {
      if (el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
    }
  }
}
