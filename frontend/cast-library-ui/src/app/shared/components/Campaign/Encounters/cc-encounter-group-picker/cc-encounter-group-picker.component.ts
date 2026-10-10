import {
  Component, ElementRef, Injector, OnDestroy, OnInit, afterNextRender, computed, effect, inject, input, output, signal,
  viewChild, viewChildren
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { CampaignCastInstance } from '../../../../models/cast.model';
import {
  CombatantHitPointsChange, EncounterCombatant, EncounterGroupPicked, PickedGroupCard, SpotCombatantRequest
} from '../../../../../core/encounter.service';
import { combatantAsCast, castCardKey } from '../../../../../core/encounter-combatant.mapper';
import { CastIndexItem, CastIndexService } from '../../../../../core/cast-index.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCounterBadgeComponent } from '../cc-counter-badge/cc-counter-badge.component';
import { CcDialCounterComponent } from '../../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';

interface PickedCard {
  key: string;
  kind: 'cast' | 'instance';
  castId: string;
  instanceId: string;
  cast: CampaignCastInstance;
  count: number;
  seedCount: number;
  hp: number;
  seedHp: number;
  combatantIds: string[];
  notes: string;
}

interface KeywordChip {
  keyword: string;
  count: number;
}

const ROW_GAP = 12;

const DRAG_TAIL_MS = 200;

const PICKED_ROW = 'picked';

const TAIL_INSET = 18;

const PICKER_CLOSE_MS = 800;

@Component({
  selector: 'cc-encounter-group-picker',
  standalone: true,
  imports: [FormsModule, CcSimpleCastCardComponent, CcCounterBadgeComponent, CcDialCounterComponent, CcTextboxComponent],
  templateUrl: './cc-encounter-group-picker.component.html',
  styleUrl: './cc-encounter-group-picker.component.scss'
})
export class CcEncounterGroupPickerComponent implements OnInit, OnDestroy {
  private shellSvc = inject(CampaignShellService);
  private castIndex = inject(CastIndexService);
  private injector = inject(Injector);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly addGroup = output<EncounterGroupPicked>();

  readonly search = signal('');

  readonly activeKeywords = signal<string[]>([]);

  readonly matchAll = signal(false);

  readonly campaignCasts = computed<CampaignCastInstance[]>(() => this.shellSvc.campaign()?.casts ?? []);

  readonly visibleCampaignCasts = computed<CampaignCastInstance[]>(() => this.campaignCasts()
    .filter(cast => this.matchesTerm(cast, this.search()) && this.matchesKeywords(cast.keywords)));

  readonly libraryCasts = computed<CastIndexItem[]>(() => {
    const campaignCastIds = new Set(this.campaignCasts().map(cast => cast.sourceCastId));
    return this.castIndex.items().filter(item => !campaignCastIds.has(item.id));
  });

  readonly visibleLibraryCasts = computed<CastIndexItem[]>(() => this.libraryCasts()
    .filter(cast => this.matchesTerm(cast, this.search()) && this.matchesKeywords(cast.keywords)));

  readonly keywordChips = computed(() =>
    this.chipsOf([...this.campaignCasts(), ...this.libraryCasts()]));

  readonly libraryNote = computed(() => this.libraryCasts().length
    ? 'No card of your library answers the filter.'
    : this.loading()
      ? 'Loading your cast library…'
      : 'Your cast library holds nothing the campaign has not already taken.');

  readonly loading = computed(() => this.castIndex.loading());
  readonly error = computed(() => this.castIndex.error());

  readonly picked = signal<PickedCard[]>([]);

  private readonly activeKey = signal('');

  readonly activePicked = computed<PickedCard | null>(() => {
    const cards = this.picked();
    return cards.find(card => card.key === this.activeKey()) ?? cards[0] ?? null;
  });

  readonly pickerOpen = computed(() => this.picked().length > 0);

  private readonly frozenPicks = signal<{ cards: PickedCard[]; active: PickedCard } | null>(null);

  private readonly pickerVisible = signal(false);

  readonly pickerClosing = signal(false);

  private closeTimer = 0;

  readonly blockCards = computed(() => this.picked().length
    ? this.picked()
    : this.frozenPicks()?.cards ?? []);

  readonly blockActive = computed<PickedCard | null>(() => {
    if (!this.pickerVisible()) return null;
    return this.picked().length ? this.activePicked() : this.frozenPicks()?.active ?? null;
  });

  readonly tailX = signal(0);

  readonly tailPlaced = signal(false);

  private readonly pickedPanel = viewChild<ElementRef<HTMLElement>>('pickedPanel');

  private readonly pickedTrack = viewChild<ElementRef<HTMLElement>>('pickedRow');

  private readonly rowTracks = viewChildren<ElementRef<HTMLElement>>('pickerRow');

  private readonly swipers = new Map<string, Swiper>();

  private rowMovedAt = 0;

  private readonly rowMoved = () => { this.rowMovedAt = Date.now(); };

  private tailFrame = 0;

  private pickedTailObserver?: ResizeObserver;

  private readonly queueTailPosition = () => {
    if (this.tailFrame) return;

    this.tailFrame = requestAnimationFrame(() => {
      this.tailFrame = 0;
      this.positionTail();
    });
  };

  readonly pickedCardCount = computed(() => this.picked().reduce((total, card) => total + card.count, 0));

  readonly pendingCount = computed(() =>
    this.picked().reduce((total, card) => total + Math.max(0, card.count - card.seedCount), 0));

  readonly addingToGroup = computed(() => this.shellSvc.encounterPickerTarget().mode === 'existing');

  readonly hpMissing = computed(() => this.picked().some(card => card.hp <= 0));

  readonly hitPointChanges = computed<CombatantHitPointsChange[]>(() => this.picked()
    .filter(card => card.combatantIds.length > 0 && card.hp > 0 && card.hp !== card.seedHp)
    .map(card => ({ combatantIds: card.combatantIds, maxHitPoints: card.hp })));

  readonly canAdd = computed(() => !this.hpMissing() && (this.pendingCount() > 0 || this.hitPointChanges().length > 0));

  readonly hasFilter = computed(() => this.search().trim().length > 0
    || this.activeKeywords().length > 0);

  ngOnInit(): void {
    this.castIndex.load();
    this.seedPickedFromTarget();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
  }

  toggleKeyword(keyword: string): void {
    this.activeKeywords.update(current => current.includes(keyword)
      ? current.filter(active => active !== keyword)
      : [...current, keyword]);
  }

  toggleMatchAll(): void {
    this.matchAll.update(value => !value);
  }

  clearFilter(): void {
    this.search.set('');
    this.activeKeywords.set([]);
  }

  selectPicked(key: string): void {
    if (this.isDragTail()) return;
    this.activeKey.set(key);
  }

  private positionTail(): void {
    const panel = this.pickedPanel()?.nativeElement;
    const track = this.pickedTrack()?.nativeElement;
    const key = this.activePicked()?.key;

    if (!panel || !track || !key) return;

    const slide = track.querySelector<HTMLElement>(`[data-card-key="${key}"]`);
    if (!slide) return;

    const panelBox = panel.getBoundingClientRect();
    const slideBox = slide.getBoundingClientRect();
    const centre = slideBox.left + slideBox.width / 2 - panelBox.left;

    this.tailX.set(Math.min(Math.max(centre, TAIL_INSET), panelBox.width - TAIL_INSET));
    this.tailPlaced.set(true);
  }

  private watchPickedTail(): void {
    const track = this.pickedTrack()?.nativeElement;
    const panel = this.pickedPanel()?.nativeElement;
    if (!track) return;

    this.pickedTailObserver?.disconnect();

    const observer = new ResizeObserver(this.queueTailPosition);
    observer.observe(track);
    if (panel) observer.observe(panel);

    this.pickedTailObserver = observer;
  }

  private releaseTail(): void {
    this.pickedTailObserver?.disconnect();
    this.pickedTailObserver = undefined;

    if (this.tailFrame) cancelAnimationFrame(this.tailFrame);
    this.tailFrame = 0;
  }

  addFromInstance(cast: CampaignCastInstance): void {
    if (this.isDragTail()) return;
    this.addCopy('instance', cast.sourceCastId, cast.instanceId, cast);
  }

  addFromLibrary(cast: CastIndexItem): void {
    if (this.isDragTail()) return;
    this.addCopy('cast', cast.id, '', this.asCastInstance(cast));
  }

  countFor(kind: 'cast' | 'instance', id: string): number {
    return this.picked().find(card => card.key === `${kind}:${id}`)?.count ?? 0;
  }

  setCount(key: string, count: number): void {
    this.picked.update(current => count <= 0
      ? current.filter(card => card.key !== key)
      : current.map(card => card.key === key ? { ...card, count } : card));
  }

  setHp(key: string, hp: number): void {
    this.picked.update(current => current.map(card => card.key === key ? { ...card, hp } : card));
  }

  setNotes(key: string, notes: string): void {
    this.picked.update(current => current.map(card => card.key === key ? { ...card, notes } : card));
  }

  onAddGroup(): void {
    if (this.hpMissing()) return;

    const cards: PickedGroupCard[] = [];
    for (const card of this.picked()) {
      const added = card.count - card.seedCount;
      for (let copy = 0; copy < added; copy++) {
        cards.push({
          request: this.requestOf(card),
          maxHitPoints: card.hp,
        });
      }
    }

    const hitPointChanges = this.hitPointChanges();
    if (!cards.length && !hitPointChanges.length) return;
    this.addGroup.emit({ cards, hitPointChanges });
  }

  private requestOf(card: PickedCard): SpotCombatantRequest {
    return {
      combatantType: 'cast',
      sourceCastId: card.castId,
      originCampaignCastInstanceId: card.instanceId || undefined,
    };
  }

  asCastInstance(item: CastIndexItem): CampaignCastInstance {
    return {
      id: item.id,
      dmUserId: '',
      name: item.name,
      pronouns: '',
      race: item.race,
      role: item.role,
      age: '',
      maxHitPoints: 0,
      posture: '',
      speed: '',
      keywords: item.keywords,
      voiceNotes: '',
      description: '',
      publicDescription: '',
      imageUrl: item.imageUrl,
      createdAt: '',
      instanceId: item.id,
      campaignId: this.campaignId(),
      sourceCastId: item.id,
      locationInstanceId: '',
      sublocationInstanceId: '',
      isVisibleToPlayers: true,
      starsCount: 0,
      voicePlacement: [],
      dmNotes: ''
    };
  }

  private addCopy(kind: 'cast' | 'instance', castId: string, instanceId: string, cast: CampaignCastInstance): void {
    const key = `${kind}:${instanceId || castId}`;
    this.picked.update(current => {
      const existing = current.find(card => card.key === key);
      return existing
        ? current.map(card => card.key === key ? { ...card, count: card.count + 1 } : card)
        : [...current, {
            key, kind, castId, instanceId, cast,
            count: 1, seedCount: 0,
            hp: cast.maxHitPoints, seedHp: 0,
            combatantIds: [],
            notes: '',
          }];
    });

    this.activeKey.set(key);
  }

  private seedPickedFromTarget(): void {
    const target = this.shellSvc.encounterPickerTarget();
    if (target.mode !== 'existing') return;

    const seeded = new Map<string, PickedCard>();
    for (const combatant of target.spotCombatants) {
      if (combatant.combatantType === 'player') continue;

      const key = this.keyOf(combatant);
      const existing = seeded.get(key);
      if (existing) {
        existing.count++;
        existing.seedCount++;
        existing.combatantIds.push(combatant.id);
        continue;
      }

      const instanceId = combatant.originCampaignCastInstanceId ?? '';
      const castId = combatant.sourceCastId ?? '';
      seeded.set(key, {
        key,
        kind: instanceId ? 'instance' : 'cast',
        castId,
        instanceId,
        cast: combatantAsCast(combatant, this.campaignId(), this.shellSvc.campaign()?.casts ?? []),
        count: 1,
        seedCount: 1,
        hp: combatant.maxHitPoints,
        seedHp: combatant.maxHitPoints,
        combatantIds: [combatant.id],
        notes: '',
      });
    }

    this.picked.set([...seeded.values()]);
  }

  private keyOf(combatant: EncounterCombatant): string {
    return castCardKey(combatant);
  }

  private isDragTail(): boolean {
    return Date.now() - this.rowMovedAt < DRAG_TAIL_MS;
  }

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: ROW_GAP,
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

  constructor() {
    effect(() => {
      const tracks = this.rowTracks().map(ref => ref.nativeElement);
      this.pickerVisible();
      this.visibleCampaignCasts().length;
      this.visibleLibraryCasts().length;

      afterNextRender(() => this.mountRows(tracks), { injector: this.injector });
    });

    effect(() => {
      const visible = this.pickerVisible();
      const key = this.blockActive()?.key ?? '';

      if (!visible || !key) {
        this.tailPlaced.set(false);
        this.releaseTail();
        return;
      }

      afterNextRender(() => this.queueTailPosition(), { injector: this.injector });
    });

    effect(() => {
      const active = this.activePicked();
      const cards = this.picked();
      if (active && cards.length) this.frozenPicks.set({ cards, active });
    });

    effect(() => {
      if (this.pickerOpen()) {
        if (this.closeTimer) clearTimeout(this.closeTimer);
        this.closeTimer = 0;
        this.pickerClosing.set(false);
        this.pickerVisible.set(true);
        return;
      }

      if (!this.pickerVisible()) return;

      this.pickerClosing.set(true);

      if (this.closeTimer) clearTimeout(this.closeTimer);
      this.closeTimer = window.setTimeout(() => {
        this.closeTimer = 0;
        this.pickerClosing.set(false);
        this.pickerVisible.set(false);
      }, PICKER_CLOSE_MS);
    });
  }

  ngOnDestroy(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.releaseTail();
    for (const rowId of [...this.swipers.keys()]) this.unmountRow(rowId);
  }

  private mountRows(tracks: HTMLElement[]) {
    const drawn = new Set<string>();

    for (const track of tracks) {
      const rowId = track.dataset['rowId'] ?? '';
      if (!rowId) continue;
      drawn.add(rowId);

      const running = this.swipers.get(rowId);

      if (running) {
        if (running.el === track) {
          running.update();
          continue;
        }
        this.unmountRow(rowId);
      }

      this.swipers.set(rowId, this.mountRow(rowId, track));
    }

    for (const rowId of [...this.swipers.keys()]) {
      if (!drawn.has(rowId)) this.unmountRow(rowId);
    }
  }

  private mountRow(rowId: string, track: HTMLElement): Swiper {
    const swiper = new Swiper(track, CcEncounterGroupPickerComponent.SWIPER_OPTIONS);

    swiper.on('touchMove', this.rowMoved);
    swiper.on('sliderMove', this.rowMoved);

    if (rowId === PICKED_ROW) {
      swiper.on('setTranslate', this.queueTailPosition);
      this.watchPickedTail();
      this.queueTailPosition();
    }

    return swiper;
  }

  private unmountRow(rowId: string) {
    const swiper = this.swipers.get(rowId);
    if (!swiper) return;

    if (rowId === PICKED_ROW) this.releaseTail();

    swiper.destroy(true, true);
    this.swipers.delete(rowId);
  }

  private matchesTerm(card: { name: string; role: string; race: string; keywords: string[] }, search: string): boolean {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return card.name.toLowerCase().includes(term)
      || card.role.toLowerCase().includes(term)
      || card.race.toLowerCase().includes(term)
      || card.keywords.some(keyword => keyword.toLowerCase().includes(term));
  }

  private matchesKeywords(cardKeywords: string[]): boolean {
    const held = this.activeKeywords();
    if (!held.length) return true;

    const own = cardKeywords.map(keyword => keyword.toLowerCase());
    const wanted = held.map(keyword => keyword.toLowerCase());
    return this.matchAll()
      ? wanted.every(keyword => own.includes(keyword))
      : wanted.some(keyword => own.includes(keyword));
  }

  private chipsOf(cards: { keywords: string[] }[]): KeywordChip[] {
    const chips = new Map<string, KeywordChip>();

    for (const card of cards) {
      for (const keyword of card.keywords) {
        const seen = chips.get(keyword.toLowerCase());
        if (seen) seen.count++;
        else chips.set(keyword.toLowerCase(), { keyword, count: 1 });
      }
    }

    return [...chips.values()].sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
  }
}
