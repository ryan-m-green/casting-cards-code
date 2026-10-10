import {
  Component, ChangeDetectionStrategy, ElementRef, Injector, OnDestroy, OnInit,
  afterNextRender, computed, effect, inject, input, signal, viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, forkJoin, map, of, switchMap } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import {
  CampaignEncounter, EncounterCombatant, EncounterGroupPicked, EncounterPlaces, EncounterSpot, EncounterService,
  ENCOUNTER_MAX_SPOTS
} from '../../../../../core/encounter.service';
import { combatantAsCast, combatantAsPlayer, castCardsOf, castSpotsOf, distinctCastCards, DistinctCastCard } from '../../../../../core/encounter-combatant.mapper';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { PlayerCard } from '../../../../models/player-card.model';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { CcEncounterCardComponent } from '../cc-encounter-card/cc-encounter-card.component';
import { CcEncounterCircleComponent, RingCombatantSelection } from '../cc-encounter-circle/cc-encounter-circle.component';
import { CcDialCounterComponent } from '../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcEncounterPlacesComponent } from '../cc-encounter-places/cc-encounter-places.component';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcSimplePlayerCardComponent } from '../../carddeck/cc-simple-player-card/cc-simple-player-card.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';

/**
 * cc-encounter-builder
 *
 * The "Encounters" (bottom-left) grid area, which has three faces:
 *
 *  - `row`    the campaign's encounter cards in one swipeable row, newest first,
 *             with a trailing "New encounter" slide. A fight that has ended is
 *             held back until the filter above the row asks for it (see statusOn).
 *  - `edit`   one encounter: the cast cards it holds, in one row — cards of the
 *             same spot sit 2px apart, whole spots 12px apart, with the "Add
 *             group" tile at the end. Groups can be renamed and added to, cards
 *             added and removed, and the encounter renamed. Nothing player
 *             related is shown: the encounter's cast is what is edited.
 *  - `circle` the encounter's group and party cards on a ring, clockwise from the
 *             top in initiative order.
 *  - `rolls`  the numbers rolled for the fight, turned in one dial per place.
 *  - `ended`  the fight as it finished: the DM's cards it held, what became of them, and
 *             the way back to the pool. An encounter that has ended opens here
 *             rather than on the ring, and is not started again from this area.
 *
 * Faces cross-fade into each other. There is no draft state: an encounter is
 * created when the DM starts one, and every change after that is written as it
 * happens.
 */

/** Faces of the bottom-left grid area. */
type BuilderMode = 'row' | 'edit' | 'circle' | 'rolls' | 'ended';

/**
 * The statuses an encounter runs through, in the order the row's filter reads them: a fight is
 * planned, then its initiative is ordered, then it is running, then it has ended.
 */
const ENCOUNTER_STATUSES = ['planned', 'ordering', 'active', 'ended'] as const;

/** One of those statuses. */
type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number];

/** How each status is written on its chip. */
const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  planned: 'Planned',
  ordering: 'Ordering',
  active: 'Active',
  ended: 'Ended',
};

/** Stand-in used before an encounter is loaded, so the signal is never null. */
const EMPTY_ENCOUNTER: CampaignEncounter = {
  id: '',
  campaignId: '',
  sequenceNumber: 0,
  name: '',
  status: '',
  spots: []
};

/** Length of the fade between two faces; kept in step with the CSS transition. */
const FADE_MS = 220;

/**
 * How long after the wrap-up's row is made that it is measured again, in ms. One paint's worth: long
 * enough for the face's cards to be laid out, short enough that the DM has not reached for the row yet
 * (see the note in the constructor's sync effect).
 */
const ENDED_MEASURE_MS = 50;

/**
 * The gutter full-size cast cards sit at, in px: the wider beat the bigger cards want between them,
 * against the 12px the rows of smaller cards in this area sit at. Two rows are laid out with it — the
 * editor's row of groups (see SPOT_SWIPER_OPTIONS), where a group is a cluster of these cards and so
 * keeps the same beat from the next group that the cards themselves keep, and the wrap-up's row of
 * cards (see ENDED_SWIPER_OPTIONS). Both rows' stylesheets carry the figure too, as the fallback for
 * the moment before Swiper is mounted over them.
 */
const CARD_GUTTER = 24;

@Component({
  selector: 'cc-encounter-builder',
  standalone: true,
  imports: [FormsModule, CcCastCardComponent, CcEncounterCardComponent, CcEncounterCircleComponent, CcDialCounterComponent, CcEncounterPlacesComponent, CcSimpleCastCardComponent, CcSimplePlayerCardComponent, CcEditButtonComponent],
  /**
   * OnPush: the encounters, the ring and the panels behind them are signals, so the builder is
   * redrawn when one of them moves — an encounter updated on another client's screen, say — and not
   * on every check the page takes.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-encounter-builder.component.html',
  styleUrl: './cc-encounter-builder.component.scss'
})
export class CcEncounterBuilderComponent implements OnInit, OnDestroy {
  private encounterApi = inject(EncounterService);
  private shellSvc = inject(V2CampaignShellService);
  private gridLoad = inject(V2GridLoadService);
  private injector = inject(Injector);

  /**
   * What the bottom-left area is known by — the heading over the encounter row, and the mark it
   * wears on the radial navigator — published for as long as the builder stands in the area (see
   * V2GridAreaMarkService).
   */
  private readonly mark = publishGridAreaMark('bottom-left', 'content', {
    title: () => ['Encounters'],
    icon: { path: '/crossed_battle_axe_weapon.svg', width: 36, height: 29 },
  });

  /** Re-entry guard for the circle's Next button: a plain field, so no template binding re-renders on it. */
  private advancingTurn = false;

  /**
   * Re-entry guard for the circle's drag and drop. The order is written once per
   * drop, so the circle must not take a second gesture while the first is being
   * saved — and, as with the Next button, the whole face must not dim for it.
   */
  private reorderingSpots = false;

  /** Campaign whose encounters are being browsed. */
  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  // ── Faces ────────────────────────────────────────────────────────────────
  readonly mode = signal<BuilderMode>('row');
  readonly fading = signal(false);

  // ── Rolls (the step between Start and the ring) ──────────────────────────

  /**
   * The numbers dialled in for the fight, per spot — one roll covers a whole group. Kept here
   * rather than on the face, so stepping away (Encounters, Edit) and back keeps them, and
   * nothing is written until Finalize order is pressed.
   */
  readonly rolls = signal<Record<string, number>>({});

  // ── Data ─────────────────────────────────────────────────────────────────
  readonly encounters = signal<CampaignEncounter[]>([]);
  readonly encounter = signal<CampaignEncounter>(EMPTY_ENCOUNTER);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');

  // ── The pool's filter ────────────────────────────────────────────────────

  /**
   * Which statuses the row draws. The three a campaign is working through are on when the area
   * opens; a fight that has ended is history, and the row is there for what is being run now, so
   * the DM asks for those with the chip above the row. Any of the four can be turned off to take
   * that status out of the row when the pool is fuller than the DM wants to read.
   */
  private readonly statusOn = signal<Record<EncounterStatus, boolean>>({
    planned: true,
    ordering: true,
    active: true,
    ended: false,
  });

  /**
   * The filter above the row, one entry per chip: the status, what the chip is called, how many of
   * the pool's encounters wear that status, whether that status is on, and what the chip's tip says
   * it does. The counts are the whole pool's, so a chip reads the same whether its cards are in the
   * row or held back (see `visibleEncounters`).
   */
  readonly statusFilters = computed(() => {
    const pool = this.encounters();
    const on = this.statusOn();

    return ENCOUNTER_STATUSES.map(status => {
      const isOn = on[status];
      return {
        status,
        label: ENCOUNTER_STATUS_LABELS[status],
        count: pool.filter(entry => entry.status === status).length,
        on: isOn,
        title: `${isOn ? 'Hide' : 'Show'} the ${status} encounters`,
      };
    });
  });

  /**
   * The encounters the row actually draws: those whose status is on. A status the builder does not
   * know is never held back — there is no chip to turn it on with.
   */
  readonly visibleEncounters = computed(() => {
    const on: Partial<Record<string, boolean>> = this.statusOn();
    return this.encounters().filter(entry => on[entry.status] ?? true);
  });

  // ── Inline renaming (a group, or the encounter itself) ───────────────────
  readonly renamingSpotId = signal('');
  readonly spotNameDraft = signal('');
  readonly renamingEncounter = signal(false);
  readonly encounterNameDraft = signal('');

  readonly hasEncounter = computed(() => !!this.encounter().id);

  /**
   * The encounter's cast combatants as one row: `castSpots()` are the spots that
   * hold cast cards, and the row lays each spot's cards out as a cluster. The
   * party is deliberately absent here — the encounter's cast is what is edited.
   */
  readonly castSpots = computed(() => castSpotsOf(this.encounter().spots));

  /** How many places a ring holds, the party's included (mirrors the server's rule). */
  readonly maxSpots = ENCOUNTER_MAX_SPOTS;

  /**
   * True once the ring holds every place it can: the party's spots are counted
   * first, so what is left for the DM is what this leaves. No new group can be
   * added from here — joining an existing group still can (that takes no place).
   */
  readonly spotsFull = computed(() => this.encounter().spots.length >= ENCOUNTER_MAX_SPOTS);

  /**
   * The ring's arithmetic, as the editor and the picker both show it: the party's
   * places plus the DM's groups. Every spot is one place, whichever it holds — a
   * group of several cards is still one of them.
   */
  readonly places = computed<EncounterPlaces>(() => ({
    players: this.encounter().spots.length - this.castSpots().length,
    groups: this.castSpots().length,
    total: ENCOUNTER_MAX_SPOTS,
  }));

  /**
   * The pad the row's first slide is carrying, in px — the last figure `measureSpotLeadPad` wrote. Kept so
   * that the row is only put back on its first group when that group's own make-up has actually moved.
   */
  private spotLeadPad = 0;

  // ── The wrap-up (what a fight leaves behind) ─────────────────────────────

  /**
   * The cast cards the fight held, one entry per distinct card — what the wrap-up draws.
   *
   * The party's own rows are left out (see the shared mapper): the wrap-up is the DM's record of the
   * fight, and what it put down is the DM's cards. A fight of nothing but party rows therefore reads
   * as an empty record rather than as a row, which is what the face's own message says.
   *
   * A group of the same card is one face with a count under it rather than the same face again and
   * again: the DM is reading what the fight held, and "three of these" is what the row is for.
   * The cards are gathered by `castCardKey`, so a card the campaign holds appears once however many
   * copies of it stood in the fight, and a card picked straight from the library is its own entry.
   */
  readonly endedFoes = computed(() =>
    distinctCastCards(this.castSpots().flatMap(spot => this.castCards(spot))));

  /** Every card the fight held, copies counted with their card: what the tally's "of" reads. */
  readonly endedFoeCount = computed(() =>
    this.endedFoes().reduce((total, card) => total + card.count, 0));

  /** How many of those copies finished the fight down. */
  readonly foesDown = computed(() =>
    this.endedFoes().reduce((total, card) => total + card.downCount, 0));

  /** The encounter as the wrap-up names it: its name, or its number for one never named. */
  readonly endedTitle = computed(() =>
    this.encounter().name || `Encounter ${this.encounter().sequenceNumber}`);

  /** When the fight ended, as the wrap-up reads it. Empty while there is nothing to read. */
  readonly endedAtLabel = computed(() => {
    const endedAt = this.encounter().endedAt;
    if (!endedAt) return '';

    const ended = new Date(endedAt);
    return Number.isNaN(ended.getTime())
      ? ''
      : ended.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  });

  /**
   * What the caption under a card says in full, for its own tooltip: how many copies of the card the
   * fight held, and what became of them. The caption itself is only the number, so this is where the
   * count is spelled out — including for a card that stood in the fight alone.
   */
  endedCountTitle(card: DistinctCastCard): string {
    const copies = card.count === 1 ? '1 copy of this card' : `${card.count} copies of this card`;
    if (!card.downCount) return `${copies} in this fight`;

    const down = card.downCount === card.count ? 'all of them down' : `${card.downCount} of them down`;
    return `${copies} in this fight, ${down}`;
  }

  /**
   * The swipeable rows, as *reactive* queries: each one is only in the DOM while
   * its face is showing, and the Swiper sync below has to run when a row appears
   * (create it) and when it goes away (tear it down). A plain @ViewChild would
   * never tell the effect either way.
   */
  private readonly encounterRowRef = viewChild<ElementRef<HTMLElement>>('encounterRow');
  private readonly combatRowRef = viewChild<ElementRef<HTMLElement>>('combatRow');
  private readonly rollsRowRef = viewChild<ElementRef<HTMLElement>>('rollsRow');
  private readonly endedFoesRowRef = viewChild<ElementRef<HTMLElement>>('endedFoesRow');

  /** The two name boxes, so a rename opened by clicking a title starts typing at once. */
  private readonly encounterNameInputRef = viewChild<ElementRef<HTMLInputElement>>('encounterNameInput');
  private readonly spotNameInputRef = viewChild<ElementRef<HTMLInputElement>>('spotNameInput');

  private readonly swipers = new Map<string, Swiper>();
  private readonly subs = new Subscription();
  private fadeTimer = 0;

  /** The second measure of the wrap-up's row, waiting on its paint (see the sync effect in the constructor). */
  private endedMeasureTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Puts the caret in the name box the moment a rename opens — clicking a title, the pencil
    // included — so the new name can be typed straight over the old one instead of the DM having
    // to reach for the box. The text comes up selected, the way renaming anything else works: the
    // first keystroke replaces the whole name.
    //
    // `preventScroll` matters here: focusing an element normally makes the browser scroll its
    // scroll ancestors to reveal it, and a swipeable row is one (its slides are moved by Swiper's
    // transform, but the row itself is still a scrollport). Without it, taking the caret into a
    // group's name box scrolls the row sideways — padding and all — which drags the cards and the
    // box flush against the row's edge.
    effect(() => {
      const renamingEncounter = this.renamingEncounter();
      const renamingSpotId = this.renamingSpotId();
      if (!renamingEncounter && !renamingSpotId) return;

      afterNextRender(() => {
        const input = renamingEncounter
          ? this.encounterNameInputRef()?.nativeElement
          : this.spotNameInputRef()?.nativeElement;

        input?.focus({ preventScroll: true });
        input?.select();
      }, { injector: this.injector });
    });

    // Keeps one Swiper alive per visible row. Driven by the row query signals, so a row that
    // enters the DOM gets its Swiper (drag + the 12px spacing) and a row that leaves gets it torn
    // down; the row's slide count is read too, so adding, removing or filtering a card re-measures
    // the row.
    effect(() => {
      const encounterRow = this.encounterRowRef()?.nativeElement;
      const combatRow = this.combatRowRef()?.nativeElement;
      const rollsRow = this.rollsRowRef()?.nativeElement;
      const endedFoesRow = this.endedFoesRowRef()?.nativeElement;

      this.visibleEncounters().length;
      this.castSpots().length;
      this.encounter().spots.length;
      this.endedFoes().length;

      afterNextRender(() => {
        // The two rows the DM sweeps through — the pool of fights and, behind the editor, the
        // groups a fight is built from — open centred, with the room to be swept into (see
        // CENTRED_SWIPER_OPTIONS). The editor's row keeps its own gutter between groups, the beat a
        // full-size card keeps from the next (see SPOT_SWIPER_OPTIONS). The dials' row behind the
        // remaining face takes the shared set-up.
        if (encounterRow) this.mountSwiper('encounters', encounterRow, CcEncounterBuilderComponent.CENTRED_SWIPER_OPTIONS);
        else this.destroySwiper('encounters');

        if (combatRow) {
          // The pad has to be on the slide before the Swiper measures it, which is why it is read here
          // rather than bound through the template (see measureSpotLeadPad).
          const leadPad = this.measureSpotLeadPad(combatRow);
          const moved = leadPad !== this.spotLeadPad;

          this.mountSwiper('combatants', combatRow, CcEncounterBuilderComponent.SPOT_SWIPER_OPTIONS);
          this.spotLeadPad = leadPad;

          // The first group's own make-up changed, so its slide has moved under the row's centring: the
          // row is put back on it, which is the group the DM was working on when they changed it.
          if (moved) this.swipers.get('combatants')?.slideTo(0, 0);
        } else {
          this.destroySwiper('combatants');
          this.measureSpotLeadPad();
          this.spotLeadPad = 0;
        }

        if (rollsRow) this.mountSwiper('rolls', rollsRow);
        else this.destroySwiper('rolls');

        // The wrap-up's row is driven here like every other row in the area, only with its own set-up
        // (see ENDED_SWIPER_OPTIONS): one path into a Swiper for all of them.
        if (endedFoesRow) {
          this.mountSwiper('ended-foes', endedFoesRow, CcEncounterBuilderComponent.ENDED_SWIPER_OPTIONS);

          // …and measured again once the face has painted. This is the one row in the area whose cards
          // are created in the same pass as the row itself, and a Swiper that measures its slides before
          // they are laid out measures nothing: every slide comes out 0 wide and the row's travel is
          // worked out from those noughts, so it drags against the wrong geometry until it is asked
          // again. The update (never a new instance: the wheel and pointer listeners on the row have to
          // stay) is what the rows mounted at load get for free by being made late.
          if (this.endedMeasureTimer !== null) window.clearTimeout(this.endedMeasureTimer);
          this.endedMeasureTimer = window.setTimeout(() => {
            this.endedMeasureTimer = null;
            this.swipers.get('ended-foes')?.update();
          }, ENDED_MEASURE_MS);
        } else {
          this.destroySwiper('ended-foes');
        }
      }, { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.refresh();
    this.subs.add(this.shellSvc.encounterGroupPicked.subscribe(combatants => this.onGroupPicked(combatants)));
    // The detail drawer writes hit points straight to the encounter: the ring on
    // screen reloads with them, so the cards there and the panels agree.
    this.subs.add(this.shellSvc.encounterChanged.subscribe(encounterId => this.onEncounterChanged(encounterId)));
  }

  ngOnDestroy(): void {
    // A second measure of the wrap-up's row, still waiting on its paint, goes with the area
    if (this.endedMeasureTimer !== null) {
      window.clearTimeout(this.endedMeasureTimer);
      this.endedMeasureTimer = null;
    }

    window.clearTimeout(this.fadeTimer);
    this.destroySwipers();
    this.subs.unsubscribe();
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  /**
   * Loads the encounter pool. The row of encounter cards is the face the area
   * opens in; nothing is opened automatically.
   */
  refresh(): void {
    this.loading.set(true);
    this.error.set('');

    this.encounterApi.list(this.campaignId()).subscribe({
      next: encounters => {
        this.encounters.set(encounters);
        this.loading.set(false);
        this.gridLoad.report('bottom-left', 'content');
      },
      error: () => {
        this.error.set('Could not load the campaign encounters.');
        this.loading.set(false);
        this.gridLoad.report('bottom-left', 'content');
      },
    });
  }

  /**
   * The filter above the row: reveals the encounters of one status, or puts them away again.
   * Nothing is written — it only decides what the row draws (see `visibleEncounters`).
   */
  toggleStatus(status: EncounterStatus): void {
    this.statusOn.update(on => ({ ...on, [status]: !on[status] }));
  }

  /**
   * "New encounter": the encounter is created (and saved) straight away and opens
   * in the editor. It starts out planned — its initiative is what makes it the
   * campaign's running encounter (see the circle's start button).
   */
  newEncounter(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');

    this.encounterApi.create(this.campaignId()).subscribe({
      next: encounter => {
        this.busy.set(false);
        this.encounter.set(encounter);
        this.transitionTo('edit');
      },
      error: () => {
        this.error.set('Could not start the encounter.');
        this.busy.set(false);
      },
    });
  }

  /**
   * The circle's start button: the encounter takes its 'ordering' state and the numbers rolled for
   * it are turned in on the rolls face. Committing them is what makes it the running encounter.
   *
   * An encounter that has ended is never started again: an ended fight is a record, and the DM runs
   * the same cards again by building a fresh encounter out of them. The rule lives here, in the area
   * that would offer the button — the face an ended encounter opens on has no start to press, and
   * this guard keeps any later face from growing one.
   */
  startInitiative(): void {
    const encounter = this.encounter();
    if (!encounter.id || this.busy() || encounter.status === 'ended') return;

    this.busy.set(true);
    this.error.set('');

    this.encounterApi.startEncounter(this.campaignId(), encounter.id).subscribe({
      next: started => {
        this.busy.set(false);
        this.patchListStatus(encounter.id, started.status || 'ordering');

        // The face opens on the numbers, not on the ring: the encounter is left as it is here and
        // takes its 'ordering' state with the encounter the server returned, then its 'active' one
        // when the order is finalized. Marking it active now would flash the circle's ring and cards
        // up behind it on the way out.
        this.seedRolls();
        this.mode.set('rolls');
      },
      error: () => {
        this.error.set('Could not start the encounter.');
        this.busy.set(false);
      },
    });
  }

  // ── Rolls (the step between Start and the ring) ──────────────────────────

  /** The number dialled in for a spot; 0 means nothing has been turned in for it. */
  rollFor(spot: EncounterSpot): number {
    return this.rolls()[spot.id] ?? 0;
  }

  /** One dial per group, so turning it is the whole group's roll. */
  setRoll(spot: EncounterSpot, value: number): void {
    this.rolls.update(current => ({ ...current, [spot.id]: value }));
  }

  /**
   * Every spot has a number dialled in for it. A 0 is what an untouched dial shows (see rollFor),
   * so a spot is numbered only once one has been turned for it — and Finalize order waits on all of
   * them, rather than being pressed into an error (see the rolls bar).
   */
  readonly rollsComplete = computed(() => {
    const spots = this.encounter().spots;
    return spots.length > 0 && spots.every(spot => (this.rolls()[spot.id] ?? 0) > 0);
  });

  /** A spot's name as the rolls face reads it — the players are in this row too. */
  spotLabel(spot: EncounterSpot): string {
    return spot.groupName || spot.combatants[0]?.displayName || 'Group';
  }

  /** A party member as the simple player card wants it. */
  asPlayer(combatant: EncounterCombatant): PlayerCard {
    return combatantAsPlayer(combatant, this.campaignId());
  }

  /**
   * The dials as they are left: anything already dialled in this session wins, and the rest starts
   * from the roll committed to the encounter — so coming back to the face, or opening a fight that
   * was set up before, shows its numbers rather than zeros.
   *
   * A spot with neither — a fight whose numbers have not been turned in yet — starts at the place it
   * stands in the row, counted from 1: its index in the encounter's spots plus one. The face then
   * opens on a full set of numbers rather than a row of zeros, with something for the DM to turn from
   * and the Finalize order button live from the start.
   *
   * Those numbers are placed the way the fight reads them, not the way the row does: the highest
   * number takes place 1 (see `finalizeOrder`), so seeding 1, 2, 3 … puts the last card of the row
   * first until the DM dials the rolls that are actually in play.
   */
  private seedRolls(): void {
    const current = this.rolls();
    const seeded: Record<string, number> = {};

    this.encounter().spots.forEach((spot, index) => {
      seeded[spot.id] = current[spot.id] ?? spot.combatants[0]?.initiativeNumber ?? index + 1;
    });

    this.rolls.set(seeded);
  }

  /**
   * Finalize order: the numbers dialled in become the fight's order — the highest takes place 1 —
   * and the circle opens with the cards standing in it.
   *
   * Nothing reaches here until every dial carries a number: the button waits on rollsComplete, so
   * a half-turned row cannot be written (there is no error to be shown for it — the button is simply
   * not pressable yet). Only the numbers that were dialled in are sent, so a spot somehow left
   * unnumbered keeps the place it already stands in rather than being pushed to the front.
   */
  finalizeOrder(): void {
    const encounter = this.encounter();
    if (!encounter.id || this.busy()) return;

    const rolled = this.rolls();
    const spots = encounter.spots
      .filter(spot => (rolled[spot.id] ?? 0) > 0)
      .map(spot => ({ spotId: spot.id, initiativeNumber: rolled[spot.id] }));

    this.busy.set(true);
    this.error.set('');

    this.encounterApi.setInitiative(this.campaignId(), encounter.id, spots).subscribe({
      next: ordered => {
        this.busy.set(false);
        this.encounter.set(ordered);
        this.transitionTo('circle');
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not save the initiative order.');
      },
    });
  }

  /** The circle's end button: the fight is over. */
  endCombat(): void {
    const encounter = this.encounter();
    if (!encounter.id || this.busy()) return;

    this.busy.set(true);
    this.error.set('');

    this.encounterApi.endEncounter(this.campaignId(), encounter.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.encounter.update(current => ({ ...current, status: 'ended' }));
        this.patchListStatus(encounter.id, 'ended');

        // Ending the fight puts its places and its rolls back to the start (see the handler), so the
        // dials this session is holding for it go too and the next ordering step begins at zero. The
        // encounter is re-read rather than patched, so what the dials are seeded from is what is stored.
        this.rolls.set({});
        this.loadDetail(encounter.id);

        // The fight is over, so the area turns to its wrap-up rather than to the pool: what the fight
        // cost and what it put down, with the way back to the pool at the top of it (see the ended
        // face). The list is left to the next read of the row — the wrap-up's own way out refreshes it.
        this.transitionTo('ended');
      },
      error: () => {
        this.error.set('Could not end the encounter.');
        this.busy.set(false);
      },
    });
  }

  /** Opens an encounter in the editor. */
  openEdit(encounter: CampaignEncounter): void {
    this.loadDetail(encounter.id, 'edit');
  }

  /**
   * The encounter card's axe button (and the editor's), which opens the encounter where its own
   * state says it belongs: 'ordering' is the step where the numbers rolled are turned in, so that is
   * the face to come back to; a planned or running encounter belongs on the ring, where the fight is
   * read and the Start button that opens the ordering step lives; and one that has ended belongs on
   * its wrap-up, which is the record of the fight rather than a place to fight it again.
   */
  openCircle(encounter: CampaignEncounter): void {
    const mode: BuilderMode = encounter.status === 'ordering'
      ? 'rolls'
      : encounter.status === 'ended' ? 'ended' : 'circle';

    if (this.encounter().id === encounter.id) {
      // Already loaded: the numbers already dialled in this session are the ones to keep, so seeding
      // leaves them and fills in the rest (see seedRolls).
      if (mode === 'rolls') this.seedRolls();
      this.transitionTo(mode);
      return;
    }

    this.loadDetail(encounter.id, mode);
  }

  /** Back to the row of encounter cards, with fresh counts. */
  backToRow(): void {
    this.renamingEncounter.set(false);
    this.renamingSpotId.set('');
    this.transitionTo('row');
    this.refresh();
  }

  // ── Groups ───────────────────────────────────────────────────────────────

  /**
   * A card was clicked on the ring (a press released before the hold): the shell
   * opens the drawer showing that place's cards, starting on the one pressed.
   * Nothing is written here — the panels read and write the combatants themselves.
   */
  openCombatantDetails(selection: RingCombatantSelection): void {
    const encounter = this.encounter();
    if (!encounter.id || !selection.cards.length) return;

    this.shellSvc.openCombatantDetailsDrawer({
      campaignId: this.campaignId(),
      encounterId: encounter.id,
      portalColor: this.portalColor(),
      spotName: selection.spotName,
      combatants: selection.cards,
      index: selection.index,
    });
  }

  /** The detail panels wrote hit points: this encounter's ring reloads with them. */
  private onEncounterChanged(encounterId: string): void {
    if (this.encounter().id !== encounterId) return;
    this.loadDetail(encounterId);
  }

  /** Opens the shell's picker drawer for a brand new group. */
  openNewGroup(): void {
    if (!this.hasEncounter()) return;

    // A new group takes a place on the ring, so a full ring has none to give: the
    // party already holds its places (see ENCOUNTER_MAX_SPOTS).
    if (this.spotsFull()) {
      this.error.set(`The initiative circle holds ${this.maxSpots} places, the party's included.`);
      return;
    }

    this.shellSvc.openEncounterGroupPickerDrawer(this.campaignId(), { mode: 'new' }, this.places());
  }

  /** Opens the picker to add more cards to an existing group. */
  openAddToGroup(spot: EncounterSpot): void {
    if (!this.hasEncounter()) return;
    this.shellSvc.openEncounterGroupPickerDrawer(this.campaignId(), {
      mode: 'existing',
      spotId: spot.id,
      spotName: this.groupLabel(spot),
      // The group's own cards seed the picker's panel, so the DM sees what is
      // already in it and only picks what is missing.
      spotCombatants: this.castCards(spot),
    }, this.places());
  }

  /**
   * The picker finished: write a new group, or append the cards to the target spot.
   *
   * Hit points are the encounter's own, and its add / spot calls do not take them,
   * so each new card's hit points are written onto its row as soon as it exists.
   * A card the picker seeded from the group is already there: only a corrected
   * hit-point value is written back for it (see `hitPointChanges`).
   */
  onGroupPicked(group: EncounterGroupPicked): void {
    const encounter = this.encounter();
    const { cards, hitPointChanges } = group;
    if (!encounter.id || (!cards.length && !hitPointChanges.length) || this.busy()) return;

    const target = this.shellSvc.encounterPickerTarget();
    this.busy.set(true);
    this.error.set('');

    // A spot's cards come back in the order they were asked for, so each card's own
    // row is the one its hit points belong on. A group only holding corrected hit
    // points adds nothing (and an empty forkJoin would never emit).
    const created$: Observable<EncounterCombatant[]> = cards.length === 0
      ? of([])
      : target.mode === 'existing'
        ? forkJoin(cards.map(card => this.encounterApi.addCombatant(this.campaignId(), encounter.id, {
            ...card.request,
            spotId: target.spotId,
          })))
        : this.encounterApi.createSpot(this.campaignId(), encounter.id, cards.map(card => card.request))
            .pipe(map(spot => spot.combatants));

    created$.pipe(
      switchMap(created => {
        // Only a value that differs from the row's own (the cast already fills it in
        // server side) is worth a call.
        const newRows = created
          .map((row, index) => ({ id: row.id, current: row.maxHitPoints, wanted: cards[index]?.maxHitPoints ?? row.maxHitPoints }))
          .filter(row => row.wanted > 0 && row.wanted !== row.current);

        const writes = [
          ...newRows.map(row => this.encounterApi.updateCombatant(
            this.campaignId(), encounter.id, row.id, { maxHitPoints: row.wanted })),
          ...hitPointChanges.flatMap(change => change.combatantIds.map(id => this.encounterApi.updateCombatant(
            this.campaignId(), encounter.id, id, { maxHitPoints: change.maxHitPoints }))),
        ];

        return writes.length ? forkJoin(writes) : of(null);
      }),
    ).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadDetail(encounter.id);
      },
      error: () => {
        this.error.set('Could not add the group.');
        this.busy.set(false);
      },
    });
  }

  /**
   * Removes one cast card from its group. Groups are not deleted on their own —
   * the last card of a group takes the group with it, so a group is never left
   * behind empty and invisible.
   */
  removeCard(spot: EncounterSpot, combatant: EncounterCombatant): void {
    const encounter = this.encounter();
    if (!encounter.id || this.busy()) return;

    this.busy.set(true);
    this.error.set('');

    this.encounterApi.removeCombatant(this.campaignId(), encounter.id, combatant.id).subscribe({
      next: () => {
        // The group goes with its last card: a group cannot be deleted on its own,
        // so it must not be left behind empty and invisible either.
        const remaining = spot.combatants.filter(card => card.id !== combatant.id);
        if (remaining.length > 0) {
          this.busy.set(false);
          this.loadDetail(encounter.id);
          return;
        }

        this.encounterApi.deleteSpot(this.campaignId(), encounter.id, spot.id).subscribe({
          next: () => {
            this.busy.set(false);
            this.loadDetail(encounter.id);
          },
          error: () => {
            this.error.set('Could not remove the group.');
            this.busy.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Could not remove the card.');
        this.busy.set(false);
      },
    });
  }

  // ── Renaming ─────────────────────────────────────────────────────────────

  startRenameGroup(spot: EncounterSpot): void {
    this.renamingSpotId.set(spot.id);
    this.spotNameDraft.set(spot.groupName ?? '');
  }

  commitRenameGroup(spot: EncounterSpot): void {
    if (this.renamingSpotId() !== spot.id) return;

    const name = this.spotNameDraft().trim();
    this.renamingSpotId.set('');
    if (!name || name === spot.groupName) return;

    const encounter = this.encounter();
    this.encounterApi.renameSpot(this.campaignId(), encounter.id, spot.id, name).subscribe({
      next: () => this.encounter.update(current => ({
        ...current,
        spots: current.spots.map(entry => entry.id === spot.id ? { ...entry, groupName: name } : entry),
      })),
      error: () => this.error.set('Could not rename the group.'),
    });
  }

  /**
   * Opens the name box on the encounter's title. Nothing has to be measured for it: the title stands in the
   * band (see .builder-title), so the box opens in the same place — the close in the repair tool's own slot
   * and the field 8px to the right of it, where the name's first letter stands.
   */
  startRenameEncounter(): void {
    this.renamingEncounter.set(true);
    this.encounterNameDraft.set(this.encounter().name);
  }

  /**
   * Closes the name box and leaves the encounter's name as it was — what the field's own close is for
   * (see the header), and the only control besides the field's own commit that closes it: a click
   * anywhere else on the face leaves the box open, carrying whatever has been typed, there to be come
   * back to. The draft goes with the box, so nothing of an abandoned rename is left behind; a name that
   * is meant to be kept is saved by Enter, which is the box's commit and puts the label back.
   */
  cancelRenameEncounter(): void {
    this.renamingEncounter.set(false);
    this.encounterNameDraft.set('');
  }

  commitRenameEncounter(): void {
    if (!this.renamingEncounter()) return;

    const encounter = this.encounter();
    const name = this.encounterNameDraft().trim();
    this.renamingEncounter.set(false);
    if (!name || name === encounter.name) return;

    this.encounterApi.renameEncounter(this.campaignId(), encounter.id, name).subscribe({
      next: () => {
        this.encounter.update(current => ({ ...current, name }));
        this.encounters.update(list =>
          list.map(entry => entry.id === encounter.id ? { ...entry, name } : entry));
      },
      error: () => this.error.set('Could not rename the encounter.'),
    });
  }

  // ── Group titles ─────────────────────────────────────────────────────────

  /**
   * The cast cards of a spot (see the shared mapper: the party is left out) — the editor's view of a
   * group, and what the wrap-up draws and `cc-encounter-card` counts a fight by.
   */
  castCards(spot: EncounterSpot): EncounterCombatant[] {
    return castCardsOf(spot);
  }

  /** The group's own name (its first card when the server left it unnamed), shown
   * on the group's controls above its cards; a group of several cards also carries
   * its card count on its first card.
   */
  groupLabel(spot: EncounterSpot): string {
    return spot.groupName || this.castCards(spot)[0]?.displayName || 'Group';
  }

  /**
   * A combatant as the simple cast card wants it (shared mapper: the campaign's
   * cast instance fills in the card face when the cast is one of them).
   */
  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  /**
   * The circle's "Next" button: advances the turn marker (the clock hand).
   *
   * The one action that must not use the shared busy flag: it is pressed over and
   * over while a fight runs, and every control on the face is bound to busy() with a
   * dimmed :disabled style - so flipping it made the whole UI blink on every turn.
   * A plain re-entry guard is all this needs; the hand sweeping is the feedback.
   */
  nextTurn(): void {
    const encounter = this.encounter();
    if (!encounter.id || this.advancingTurn) return;

    this.advancingTurn = true;
    this.error.set('');

    this.encounterApi.advanceTurn(this.campaignId(), encounter.id, 'next').subscribe({
      next: result => {
        this.advancingTurn = false;
        this.encounter.update(current => ({
          ...current,
          currentSpotId: result?.currentSpotId ?? current.currentSpotId,
        }));
      },
      error: () => {
        this.error.set('Could not advance the turn.');
        this.advancingTurn = false;
      },
    });
  }

  // ── Ring order (the circle's drag and drop) ──────────────────────────────

  /**
   * A group was dropped on a new place on the ring. The order is painted straight
   * away and written behind it, so the cards come back from the drag already in
   * their new order; a failed write puts the saved order back.
   *
   * The circle always hands over the encounter's whole ring: the stored order is
   * per encounter, so a partial list would leave two spots claiming one place.
   * The turn stays where it was: the marker moves onto whichever group the drop put
   * on that place (the server does the same), so the clock hand does not stir and
   * the next turn is still one place on.
   */
  reorderSpots(spotIds: string[]): void {
    const encounter = this.encounter();
    if (!encounter.id || this.reorderingSpots) return;

    const byId = new Map(encounter.spots.map(spot => [spot.id, spot]));
    const ordered = spotIds
      .map(id => byId.get(id))
      .filter((spot): spot is EncounterSpot => !!spot);

    if (ordered.length !== encounter.spots.length) return;

    const markerPlace = encounter.spots.findIndex(spot => spot.id === encounter.currentSpotId);
    const currentSpotId = markerPlace < 0
      ? encounter.currentSpotId
      : ordered[markerPlace]?.id ?? encounter.currentSpotId;

    this.reorderingSpots = true;
    this.error.set('');

    this.encounter.update(current => ({ ...current, spots: ordered, currentSpotId }));

    this.encounterApi.reorderSpots(this.campaignId(), encounter.id, spotIds).subscribe({
      next: () => {
        this.reorderingSpots = false;
      },
      error: () => {
        this.reorderingSpots = false;
        // Put the saved order back on the ring first (the reload clears the error
        // line), then say why the drop did not stick.
        this.loadDetail(encounter.id);
        this.error.set('Could not save the new initiative order.');
      },
    });
  }

  /** Keeps the row's card for this encounter in step with its status. */
  private patchListStatus(encounterId: string, status: string): void {
    this.encounters.update(list =>
      list.map(entry => entry.id === encounterId ? { ...entry, status } : entry));
  }

  private loadDetail(encounterId: string, mode?: BuilderMode): void {
    this.error.set('');

    this.encounterApi.get(this.campaignId(), encounterId).subscribe({
      next: encounter => {
        this.encounter.set(encounter);
        this.renamingSpotId.set('');
        this.renamingEncounter.set(false);
        // The dials start from this encounter's own numbers (see seedRolls).
        if (mode === 'rolls') this.seedRolls();
        if (mode) this.transitionTo(mode);
      },
      error: () => this.error.set('Could not load the encounter.'),
    });
  }

  /** Cross-fades from the current face to the next one. */
  private transitionTo(mode: BuilderMode): void {
    window.clearTimeout(this.fadeTimer);
    this.fading.set(true);
    this.fadeTimer = window.setTimeout(() => {
      this.mode.set(mode);
      this.fading.set(false);
    }, FADE_MS);
  }

  // ── Swipeable rows ───────────────────────────────────────────────────────

  /** Shared Swiper set-up: free-form sideways dragging, 12px between slides. */
  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    // The 12px between two encounter cards lives here — Swiper owns the spacing,
    // so it is kept while the row is dragged (see the CSS fallback for the case
    // where the row has no instance yet).
    spaceBetween: 12,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  /**
   * The set-up the area's swept rows share: the shared one, with the row opened the way the realm's
   * card row and the factions' row are opened (see cc-card-navigation and cc-card-faction-navigation,
   * whose Swipers both set `centeredSlides`) — the rows the DM sweeps through take their place among
   * the campaign's card rows, and the room those rows are swept through comes with them.
   *
   * Two rows wear it: the pool of fights (the "encounters" row) and the editor's row of group spots
   * (the "combatants" row, which is laid out with its own gutter — see SPOT_SWIPER_OPTIONS). They are
   * the two rows in this area whose length is the DM's to work through — one is the campaign's fights,
   * the other the fight being built — so the same half-row of black opens before the first of their
   * cards. The dials' row and the wrap-up's row keep the shared set-up (the wrap-up its own — see
   * ENDED_SWIPER_OPTIONS): the first is a row of fixed places to be turned in, the second a record to
   * be read.
   *
   * Centred slides are what give a row that room. Left uncentred, Swiper lays the first card on the
   * row's own left edge and works the travel out as "content minus row", throwing away every snap
   * point it cannot travel to (see the library's `updateSlides`, "Remove last grid elements
   * depending on width"): a row whose cards fit collapses to a single point, and the overflow watch
   * reads that as nowhere to go and locks the row — the same locking the wrap-up's row is written
   * around (see ENDED_SWIPER_OPTIONS). A locked row is one the DM cannot reach past its first
   * screenful, however much it holds.
   *
   * With centred slides each card keeps a snap point of its own, so the row is never locked while it
   * holds more than one, and the first card opens half a row in from the row's left edge: the
   * opening translate is `(rowWidth - cardWidth) / 2`, which is the `-slidesGrid[0]` Swiper works
   * out for a centred first slide. (`rowWidth` is the row's own `clientWidth`, so an inset the row
   * carries is counted in it and the card stands that same hair to the right of the row's exact
   * middle — the pool's 24px inset and the factions' row's 2rem alike.) The row therefore opens on
   * its first card standing in the middle of the row, with the rest waiting to the right and that
   * whole half-row of black available to the hand — the same room, in the same place, as the
   * factions' row has where it starts.
   *
   * `observeParents` comes with it, as it does on those two rows: a row is drawn while its face
   * cross-fades in, so the box it is measured against can settle after the row itself has.
   *
   * Both rows are free-mode, and that is what keeps the room from costing the DM their place:
   * Swiper's `update` re-clamps the row's current translate into the new bounds rather than sending
   * it back to the first slide (see its own `update`, where free mode takes the `setTranslate`
   * branch). Adding a group, adding a card to one, or renaming one re-measures the row through the
   * same path (see `mountSwiper`) and leaves it where the DM had it.
   */
  private static readonly CENTRED_SWIPER_OPTIONS = {
    ...CcEncounterBuilderComponent.SWIPER_OPTIONS,
    centeredSlides: true,
    observeParents: true,
  };

  /**
   * The editor's row of groups: the centred set-up (see CENTRED_SWIPER_OPTIONS), with the wider gutter a
   * full-size cast card keeps from the next (see CARD_GUTTER). A group is a cluster of those cards, so
   * the beat between two groups is the same one the cards themselves keep — which is what makes one
   * group read as a group rather than as more cards in the row.
   *
   * The row opens with its first group on the middle of the screen, and so with the ＋ tile there where
   * the fight holds no group yet: nothing of the row needs an inset for that, since a centred row's first
   * slide lands on the middle of its own box (see the row's own rule in the stylesheet, where the inset a
   * row must *not* carry is set out at length).
   */
  private static readonly SPOT_SWIPER_OPTIONS = {
    ...CcEncounterBuilderComponent.CENTRED_SWIPER_OPTIONS,
    spaceBetween: CARD_GUTTER,
  };

  /**
   * The wrap-up's own set-up: the shared one, with the wider gutter the full-size cast cards want
   * between them (see CARD_GUTTER) — and with Swiper's overflow watch switched off.
   *
   * That watch is what locks a row whose slides all fit. `checkOverflow` reads a snap grid holding a
   * single point as "there is nowhere to travel" and sets `allowSlideNext` and `allowSlidePrev` false;
   * a row with both false has every drag thrown away (see the library's `onTouchMove`: "direction
   * locks"), its wheel clamped between a `minTranslate` and a `maxTranslate` that are both zero, and —
   * through `setGrabCursor`'s own guard — no grab cursor to say so. A row of 150px cards at a 24px
   * gutter needs eight of them to overflow a 1280px area and eleven to overflow a 1920px one, so the
   * cards a fight leaves behind fit this area on every screen a DM is likely to be reading, and a
   * wrap-up row under the watch is a row that cannot be turned at all. Without it the row answers the
   * hand either way: it travels when there is more to see and rubber-bands when there is not.
   *
   * This is the only difference from the shared set-up, and it is kept to one: the row is otherwise a
   * row of cards like every other row in this area — the same modules, the same free-mode drag, the
   * same wheel handling, mounted by the same effect (the constructor's sync effect).
   */
  private static readonly ENDED_SWIPER_OPTIONS = {
    ...CcEncounterBuilderComponent.SWIPER_OPTIONS,
    spaceBetween: CARD_GUTTER,
    watchOverflow: false,
  };

  private mountSwiper(
    key: string,
    element: HTMLElement,
    options = CcEncounterBuilderComponent.SWIPER_OPTIONS
  ): void {
    const existing = this.swipers.get(key);
    if (existing) {
      // Same element: the row only gained or lost slides, so re-measure it.
      if (existing.el === element) {
        existing.update();
        return;
      }
      this.destroySwiper(key);
    }

    this.swipers.set(key, new Swiper(element, options));
  }

  private destroySwiper(key: string): void {
    const swiper = this.swipers.get(key);
    if (!swiper) return;

    swiper.destroy(true, true);
    this.swipers.delete(key);
  }

  private destroySwipers(): void {
    for (const key of [...this.swipers.keys()]) this.destroySwiper(key);
  }

  /**
   * Balances the row's first slide on the group's own first card, so that the card — not the whole cluster
   * it belongs to — stands on the middle of the screen: the row opens with that slide centred (see
   * SPOT_SWIPER_OPTIONS), and a group is more than its first card, so the slide is padded by the rest of
   * the group — the other cards beside it, and the add column at the foot of them — and the two then
   * balance each other about the row's centring (see the stylesheet's own rule on the first slide). The
   * pad is empty: nothing is drawn in it.
   *
   * Written straight onto the row as a custom property rather than bound through the template, because the
   * Swiper has to measure it: the pad is part of that slide's width, so it has to be in place before the
   * row is mounted or re-measured — which is why the sync effect in the constructor asks for it first. It
   * answers with the figure it wrote, so the caller can tell whether the first group itself moved.
   *
   * The figure is a group's own geometry — the cards' fixed width and the add column's few characters — so
   * nothing about the viewport enters it, and it does not have to be read again when the window changes
   * size. With no group to read — a fight holding none yet, its row the ＋ tile alone — the pad is nought:
   * the tile is centred by its own width.
   */
  private measureSpotLeadPad(row?: HTMLElement): number {
    const firstSlide = row?.querySelector<HTMLElement>('.swiper-slide');
    // The group's own row of cards, not the slide: a slide's width counts the pad itself, so measuring the
    // slide would feed each re-measure back into the next (see the figure below), where this row's width is
    // the cluster — the cards and the add column — and nothing else.
    const firstCluster = firstSlide?.querySelector<HTMLElement>('.spot-cards');
    const firstCard = firstCluster?.querySelector<HTMLElement>('.combatant');
    const pad = firstCluster && firstCard ? Math.max(0, firstCluster.offsetWidth - firstCard.offsetWidth) : 0;

    row?.style.setProperty('--spot-lead-pad', `${pad}px`);

    return pad;
  }
}
