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
import { combatantAsCast, combatantAsPlayer, castCardsOf, castSpotsOf } from '../../../../../core/encounter-combatant.mapper';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { PlayerCard } from '../../../../models/player-card.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { EncounterCelebrationService } from '../../../../../core/encounter-celebration.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CcEncounterCardComponent } from '../cc-encounter-card/cc-encounter-card.component';
import { CcEncounterCircleComponent, RingCombatantSelection } from '../cc-encounter-circle/cc-encounter-circle.component';
import { CcDialCounterComponent } from '../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcEncounterPlacesComponent } from '../cc-encounter-places/cc-encounter-places.component';
import { CcEncounterEndedComponent } from '../cc-encounter-ended/cc-encounter-ended.component';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcSimplePlayerCardComponent } from '../../carddeck/cc-simple-player-card/cc-simple-player-card.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CcEncounterControlsComponent } from '../cc-encounter-controls/cc-encounter-controls.component';

type BuilderMode = 'row' | 'edit' | 'circle' | 'rolls' | 'ended';

const ENCOUNTER_STATUSES = ['planned', 'ordering', 'active', 'ended'] as const;

type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number];

const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  planned: 'Planned',
  ordering: 'Ordering',
  active: 'Active',
  ended: 'Ended',
};

const EMPTY_ENCOUNTER: CampaignEncounter = {
  id: '',
  campaignId: '',
  sequenceNumber: 0,
  name: '',
  status: '',
  spots: []
};

const FADE_MS = 220;

const CELEBRATION_FALLBACK_MS = 5200;

const CARD_GUTTER = 24;

@Component({
  selector: 'cc-encounter-builder',
  standalone: true,
  imports: [FormsModule, CcCastCardComponent, CcEncounterCardComponent, CcEncounterCircleComponent, CcDialCounterComponent, CcEncounterPlacesComponent, CcEncounterEndedComponent, CcSimpleCastCardComponent, CcSimplePlayerCardComponent, CcEditButtonComponent, CcEncounterControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-encounter-builder.component.html',
  styleUrl: './cc-encounter-builder.component.scss'
})
export class CcEncounterBuilderComponent implements OnInit, OnDestroy {
  private encounterApi = inject(EncounterService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private celebration = inject(EncounterCelebrationService);
  private injector = inject(Injector);

  private readonly mark = publishGridAreaMark('bottom-left', 'content', {
    title: () => ['Encounters'],
    icon: { path: '/spear_shield_weaponry.svg', width: 38, height: 38 },
  });

  private advancingTurn = false;

  private reorderingSpots = false;

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly mode = signal<BuilderMode>('row');
  readonly fading = signal(false);

  readonly rolls = signal<Record<string, number>>({});

  readonly encounters = signal<CampaignEncounter[]>([]);
  readonly encounter = signal<CampaignEncounter>(EMPTY_ENCOUNTER);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');

  private readonly statusOn = signal<Record<EncounterStatus, boolean>>({
    planned: true,
    ordering: true,
    active: true,
    ended: false,
  });

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

  readonly visibleEncounters = computed(() => {
    const on: Partial<Record<string, boolean>> = this.statusOn();
    return this.encounters().filter(entry => on[entry.status] ?? true);
  });

  readonly renamingSpotId = signal('');
  readonly spotNameDraft = signal('');
  readonly renamingEncounter = signal(false);
  readonly encounterNameDraft = signal('');

  readonly hasEncounter = computed(() => !!this.encounter().id);

  readonly castSpots = computed(() => castSpotsOf(this.encounter().spots));

  readonly maxSpots = ENCOUNTER_MAX_SPOTS;

  readonly spotsFull = computed(() => this.encounter().spots.length >= ENCOUNTER_MAX_SPOTS);

  /**
   * The places the ring should deal in (fall into position) the next time it draws: what the edit
   * view has just added to a fight that is already running (see startFromCard).
   */
  readonly arrivals = signal<readonly string[]>([]);

  /**
   * The places the ring was drawn with when the edit view opened: whatever is added on top of this
   * list while it is open is what the ring deals in (see arrivalsOf).
   */
  private ringSpotIds: readonly string[] = [];

  readonly places = computed<EncounterPlaces>(() => ({
    players: this.encounter().spots.length - this.castSpots().length,
    groups: this.castSpots().length,
    total: ENCOUNTER_MAX_SPOTS,
  }));

  private spotLeadPad = 0;

  private readonly encounterRowRef = viewChild<ElementRef<HTMLElement>>('encounterRow');
  private readonly combatRowRef = viewChild<ElementRef<HTMLElement>>('combatRow');
  private readonly rollsRowRef = viewChild<ElementRef<HTMLElement>>('rollsRow');

  private readonly encounterNameInputRef = viewChild<ElementRef<HTMLInputElement>>('encounterNameInput');
  private readonly spotNameInputRef = viewChild<ElementRef<HTMLInputElement>>('spotNameInput');

  private readonly swipers = new Map<string, Swiper>();
  private readonly subs = new Subscription();
  private fadeTimer = 0;
  private endedTimer = 0;
  private pendingEndedId = '';

  constructor() {
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

    effect(() => {
      const encounterRow = this.encounterRowRef()?.nativeElement;
      const combatRow = this.combatRowRef()?.nativeElement;
      const rollsRow = this.rollsRowRef()?.nativeElement;

      this.visibleEncounters().length;
      this.castSpots().length;
      this.encounter().spots.length;

      afterNextRender(() => {
        if (encounterRow) this.mountSwiper('encounters', encounterRow, CcEncounterBuilderComponent.CENTRED_SWIPER_OPTIONS);
        else this.destroySwiper('encounters');

        if (combatRow) {
          const leadPad = this.measureSpotLeadPad(combatRow);
          const moved = leadPad !== this.spotLeadPad;

          this.mountSwiper('combatants', combatRow, CcEncounterBuilderComponent.SPOT_SWIPER_OPTIONS);
          this.spotLeadPad = leadPad;

          if (moved) this.swipers.get('combatants')?.slideTo(0, 0);
        } else {
          this.destroySwiper('combatants');
          this.measureSpotLeadPad();
          this.spotLeadPad = 0;
        }

        if (rollsRow) this.mountSwiper('rolls', rollsRow);
        else this.destroySwiper('rolls');
      }, { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.refresh();
    this.subs.add(this.shellSvc.encounterGroupPicked.subscribe(combatants => this.onGroupPicked(combatants)));
    this.subs.add(this.shellSvc.encounterChanged.subscribe(encounterId => this.onEncounterChanged(encounterId)));
    this.subs.add(this.celebration.finished$.subscribe(() => this.runEndedTransition()));
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.fadeTimer);
    window.clearTimeout(this.endedTimer);
    this.destroySwipers();
    this.subs.unsubscribe();
  }

  private runEndedTransition(): void {
    const encounterId = this.pendingEndedId;
    if (!encounterId) return;

    this.pendingEndedId = '';
    window.clearTimeout(this.endedTimer);
    this.endedTimer = 0;

    this.encounter.update(current => ({ ...current, status: 'ended' }));
    this.patchListStatus(encounterId, 'ended');
    this.loadDetail(encounterId);
    this.transitionTo('ended');
  }

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

  toggleStatus(status: EncounterStatus): void {
    this.statusOn.update(on => ({ ...on, [status]: !on[status] }));
  }

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
   * Starts a fight from its own card: the encounter leaves 'planned' for 'ordering' and the DM is
   * taken straight to the rolls, where the numbers are turned in and the order is finalized. There
   * is no start button on the ring itself, and a fight that is already running is left alone: its
   * play button only closes the edit view, back onto the ring (see the active case below).
   */
  startFromCard(encounter: CampaignEncounter): void {
    if (!encounter.id || this.busy() || encounter.status === 'ended') return;

    // A fight that is already running keeps its order: the play button only takes the DM back to
    // the ring, dealing in whatever the edit added on the end of it.
    if (encounter.status === 'active') {
      this.loadDetail(encounter.id, 'circle', true);
      return;
    }

    this.busy.set(true);
    this.error.set('');

    this.encounterApi.startEncounter(this.campaignId(), encounter.id).subscribe({
      next: started => {
        this.busy.set(false);
        this.patchListStatus(encounter.id, started.status || 'ordering');
        this.loadDetail(encounter.id, 'rolls');
      },
      error: () => {
        this.error.set('Could not start the encounter.');
        this.busy.set(false);
      },
    });
  }

  rollFor(spot: EncounterSpot): number {
    return this.rolls()[spot.id] ?? 0;
  }

  setRoll(spot: EncounterSpot, value: number): void {
    this.rolls.update(current => ({ ...current, [spot.id]: value }));
  }

  readonly rollsComplete = computed(() => {
    const spots = this.encounter().spots;
    return spots.length > 0 && spots.every(spot => (this.rolls()[spot.id] ?? 0) > 0);
  });

  spotLabel(spot: EncounterSpot): string {
    return spot.groupName || spot.combatants[0]?.displayName || 'Group';
  }

  asPlayer(combatant: EncounterCombatant): PlayerCard {
    return combatantAsPlayer(combatant, this.campaignId());
  }

  private seedRolls(): void {
    const current = this.rolls();
    const seeded: Record<string, number> = {};

    this.encounter().spots.forEach((spot, index) => {
      seeded[spot.id] = current[spot.id] ?? spot.combatants[0]?.initiativeNumber ?? index + 1;
    });

    this.rolls.set(seeded);
  }

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

        this.rolls.set({});
        this.loadDetail(encounter.id);

        this.transitionTo('ended');
      },
      error: () => {
        this.error.set('Could not end the encounter.');
        this.busy.set(false);
      },
    });
  }

  openEdit(encounter: CampaignEncounter): void {
    this.loadDetail(encounter.id, 'edit');
  }

  openCircle(encounter: CampaignEncounter): void {
    const mode: BuilderMode = encounter.status === 'ordering'
      ? 'rolls'
      : encounter.status === 'ended' ? 'ended' : 'circle';

    if (this.encounter().id === encounter.id) {
      if (mode === 'rolls') this.seedRolls();
      // A ring that is already drawn has nothing left to deal in.
      this.arrivals.set([]);
      this.transitionTo(mode);
      return;
    }

    this.loadDetail(encounter.id, mode);
  }

  backToRow(): void {
    this.renamingEncounter.set(false);
    this.renamingSpotId.set('');
    this.transitionTo('row');
    this.refresh();
  }

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

  private onEncounterChanged(encounterId: string): void {
    if (this.encounter().id !== encounterId) return;
    this.loadDetail(encounterId);
  }

  openNewGroup(): void {
    if (!this.hasEncounter()) return;

    if (this.spotsFull()) {
      this.error.set(`The initiative circle holds ${this.maxSpots} places, the party's included.`);
      return;
    }

    this.shellSvc.openEncounterGroupPickerDrawer(this.campaignId(), { mode: 'new' }, this.places());
  }

  openConditions(): void {
    this.shellSvc.openConditionLibraryDrawer(this.campaignId());
  }

  openAddToGroup(spot: EncounterSpot): void {
    if (!this.hasEncounter()) return;
    this.shellSvc.openEncounterGroupPickerDrawer(this.campaignId(), {
      mode: 'existing',
      spotId: spot.id,
      spotName: this.groupLabel(spot),
      spotCombatants: this.castCards(spot),
    }, this.places());
  }

  onGroupPicked(group: EncounterGroupPicked): void {
    const encounter = this.encounter();
    const { cards, hitPointChanges } = group;
    if (!encounter.id || (!cards.length && !hitPointChanges.length) || this.busy()) return;

    const target = this.shellSvc.encounterPickerTarget();
    this.busy.set(true);
    this.error.set('');

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

  removeCard(spot: EncounterSpot, combatant: EncounterCombatant): void {
    const encounter = this.encounter();
    if (!encounter.id || this.busy()) return;

    this.busy.set(true);
    this.error.set('');

    this.encounterApi.removeCombatant(this.campaignId(), encounter.id, combatant.id).subscribe({
      next: () => {
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

  startRenameEncounter(): void {
    this.renamingEncounter.set(true);
    this.encounterNameDraft.set(this.encounter().name);
  }

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

  castCards(spot: EncounterSpot): EncounterCombatant[] {
    return castCardsOf(spot);
  }

  groupLabel(spot: EncounterSpot): string {
    return spot.groupName || this.castCards(spot)[0]?.displayName || 'Group';
  }

  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

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

        if (result?.ended) {
          this.pendingEndedId = encounter.id;
          this.rolls.set({});

          window.clearTimeout(this.endedTimer);
          this.endedTimer = window.setTimeout(() => this.runEndedTransition(), CELEBRATION_FALLBACK_MS);
        }
      },
      error: () => {
        this.error.set('Could not advance the turn.');
        this.advancingTurn = false;
      },
    });
  }

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
        this.loadDetail(encounter.id);
        this.error.set('Could not save the new initiative order.');
      },
    });
  }

  private patchListStatus(encounterId: string, status: string): void {
    this.encounters.update(list =>
      list.map(entry => entry.id === encounterId ? { ...entry, status } : entry));
  }

  /**
   * Loads one encounter and, when a mode is given, fades through to it. `deal` marks the places the
   * ring has not drawn yet for the deal-in animation, which is only wanted when the play button is
   * closing the edit view of a fight that is already running (see startFromCard).
   */
  private loadDetail(encounterId: string, mode?: BuilderMode, deal = false): void {
    this.error.set('');

    this.encounterApi.get(this.campaignId(), encounterId).subscribe({
      next: encounter => {
        this.encounter.set(encounter);
        this.arrivals.set(deal ? this.arrivalsOf(encounter) : []);
        this.renamingSpotId.set('');
        this.renamingEncounter.set(false);
        if (mode === 'rolls') this.seedRolls();
        if (mode) this.transitionTo(mode);
      },
      error: () => this.error.set('Could not load the encounter.'),
    });
  }

  /**
   * What the ring is to deal in: the places it has not drawn before. The server appends a new spot
   * to the end of the order (see CreateEncounterSpotCommandHandler), so the places the edit added
   * are the last ones and fall in there.
   */
  private arrivalsOf(encounter: CampaignEncounter): readonly string[] {
    const drawn = new Set(this.ringSpotIds);

    return encounter.spots.filter(spot => !drawn.has(spot.id)).map(spot => spot.id);
  }

  private transitionTo(mode: BuilderMode): void {
    // Leaving for the edit view remembers the ring as it stands, so the play button can deal in
    // whatever the edit adds to it (see arrivalsOf).
    if (mode === 'edit') this.ringSpotIds = this.encounter().spots.map(spot => spot.id);

    window.clearTimeout(this.fadeTimer);
    this.fading.set(true);
    this.fadeTimer = window.setTimeout(() => {
      this.mode.set(mode);
      this.fading.set(false);
    }, FADE_MS);
  }

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
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

  private static readonly CENTRED_SWIPER_OPTIONS = {
    ...CcEncounterBuilderComponent.SWIPER_OPTIONS,
    centeredSlides: true,
    observeParents: true,
  };

  private static readonly SPOT_SWIPER_OPTIONS = {
    ...CcEncounterBuilderComponent.CENTRED_SWIPER_OPTIONS,
    spaceBetween: CARD_GUTTER,
  };

  private mountSwiper(
    key: string,
    element: HTMLElement,
    options = CcEncounterBuilderComponent.SWIPER_OPTIONS
  ): void {
    const existing = this.swipers.get(key);
    if (existing) {
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

  private measureSpotLeadPad(row?: HTMLElement): number {
    const firstSlide = row?.querySelector<HTMLElement>('.swiper-slide');
    const firstCluster = firstSlide?.querySelector<HTMLElement>('.spot-cards');
    const firstCard = firstCluster?.querySelector<HTMLElement>('.combatant');
    const pad = firstCluster && firstCard ? Math.max(0, firstCluster.offsetWidth - firstCard.offsetWidth) : 0;

    row?.style.setProperty('--spot-lead-pad', `${pad}px`);

    return pad;
  }
}
