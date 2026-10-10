import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampaignCastInstance } from '../../../../models/cast.model';
import {
  CombatantHitPointsChange, EncounterCombatant, EncounterGroupPicked, EncounterPlaces, PickedGroupCard, SpotCombatantRequest
} from '../../../../../core/encounter.service';
import { combatantAsCast, castCardKey } from '../../../../../core/encounter-combatant.mapper';
import { CAST_INDEX_SET_SIZE, CastIndexItem, CastIndexService } from '../../../../../core/cast-index.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCounterBadgeComponent } from '../cc-counter-badge/cc-counter-badge.component';
import { CcDialCounterComponent } from '../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcEncounterPlacesComponent } from '../cc-encounter-places/cc-encounter-places.component';

/** A card picked for the group being built, with how many copies to add. */
interface PickedCard {
  /** `cast:<library id>` or `instance:<campaign instance id>` — stable list key. */
  key: string;
  kind: 'cast' | 'instance';
  /** Library cast id, always present (an encounter spot stores the source cast). */
  castId: string;
  /** Campaign cast instance id when the pick came from the campaign segment ('' otherwise). */
  instanceId: string;
  /** The card face the picked row draws (`cc-simple-cast-card`). */
  cast: CampaignCastInstance;
  /** Copies the row shows: the group's resulting total once the run is written. */
  count: number;
  /**
   * Copies the group already holds — `count` for a row that came from the group
   * being added to, 0 for a card picked fresh here. Only `count - seedCount` is
   * written, so a seeded row is topped up rather than added a second time.
   */
  seedCount: number;
  /** Max hit points the row goes into the fight with (the counter the DM dials). */
  hp: number;
  /**
   * Max hit points the group's rows hold today, for a seeded card. A value the DM
   * changed away from this is a correction to write onto those rows.
   */
  seedHp: number;
  /** The rows a seeded card stands for: its own duplicates of the group ([] when picked here). */
  combatantIds: string[];
}

/**
 * cc-encounter-group-picker
 *
 * Drawer content for building one encounter group. The DM picks cards and how
 * many copies of each, then adds the whole group in a single call.
 *
 * Opened from a group's own ＋ ("Add to <group>"), the group's cards arrive as
 * the target's `spotCombatants` and seed the picked panel, so the DM sees the
 * cards already chosen for it. A row's counter is then the group's *resulting*
 * count and only the difference is written (see `seedCount`).
 *
 * Every row also carries the card's max hit points, and a card without one holds
 * the whole group back: hit points are what the fight reads off the card, so
 * nothing is added until each row has a value (see `hpMissing`).
 *
 * The two sources are one list, campaign first: casts already in this campaign
 * come from the shell (no fetch), then the DM's wider cast library pages in
 * behind them 25 cards at a time. Free-text search and keyword chips (with
 * counts) span both segments. Each picked card takes its own row — the simple
 * cast card, then `cc-counter-badge` for its copies — so the card face names it.
 */
@Component({
  selector: 'cc-encounter-group-picker',
  standalone: true,
  imports: [FormsModule, CcSimpleCastCardComponent, CcCounterBadgeComponent, CcDialCounterComponent, CcEncounterPlacesComponent],
  templateUrl: './cc-encounter-group-picker.component.html',
  styleUrl: './cc-encounter-group-picker.component.scss'
})
export class CcEncounterGroupPickerComponent implements OnInit {
  private shellSvc = inject(V2CampaignShellService);
  private castIndex = inject(CastIndexService);

  /** Campaign whose casts are offered first. */
  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');
  /**
   * Where the encounter's ring stands (the editor's own arithmetic: the party's
   * places plus the DM's groups). Carried in, so the drawer shows the same count the
   * editor does — what a group about to be added would take a place from.
   */
  readonly places = input<EncounterPlaces | null>(null);

  /** Emits the finished group (cards with their hit points, and hit-point corrections). */
  readonly addGroup = output<EncounterGroupPicked>();

  // ── Filter ───────────────────────────────────────────────────────────────
  readonly search = signal('');
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  private searchTimer = 0;

  // ── Library paging (the service owns the fetched sets) ───────────────────
  /**
   * Library sets, minus the casts already shown in the campaign segment (they
   * are matched by the campaign instance's source cast), so the same card never
   * appears twice in the picker.
   */
  readonly libraryCasts = computed(() => {
    const campaignCastIds = new Set((this.shellSvc.campaign()?.casts ?? []).map(cast => cast.sourceCastId));
    return this.castIndex.items().filter(item => !campaignCastIds.has(item.id));
  });
  readonly keywordChips = computed(() => this.castIndex.keywords());
  readonly loading = computed(() => this.castIndex.loading());
  readonly totalCount = computed(() => this.castIndex.totalCount());
  readonly lastSetLoaded = computed(() => this.castIndex.lastSetLoaded());
  readonly totalSets = computed(() => this.castIndex.totalSets());
  readonly error = computed(() => this.castIndex.error());
  readonly setSize = CAST_INDEX_SET_SIZE;

  // ── Selection ────────────────────────────────────────────────────────────
  readonly picked = signal<PickedCard[]>([]);

  /** The group's total once the run is written: seeded rows counted with the new picks. */
  readonly pickedCardCount = computed(() => this.picked().reduce((total, card) => total + card.count, 0));

  /** The copies the add button actually writes: each row's count above what the group holds. */
  readonly pendingCount = computed(() =>
    this.picked().reduce((total, card) => total + Math.max(0, card.count - card.seedCount), 0));

  /** True when the picker is adding to an existing group, whose cards seed the panel. */
  readonly addingToGroup = computed(() => this.shellSvc.encounterPickerTarget().mode === 'existing');

  /** Cards still without max hit points: the group is held back until every one has a value. */
  readonly hpMissing = computed(() => this.picked().some(card => card.hp <= 0));

  /**
   * Hit points the DM dialled for cards the group already holds. Seeded rows are
   * not added again, so a corrected value is a write of its own.
   */
  readonly hitPointChanges = computed<CombatantHitPointsChange[]>(() => this.picked()
    .filter(card => card.combatantIds.length > 0 && card.hp > 0 && card.hp !== card.seedHp)
    .map(card => ({ combatantIds: card.combatantIds, maxHitPoints: card.hp })));

  /** True when pressing the button writes something: cards, hit points, or both. */
  readonly canAdd = computed(() => !this.hpMissing() && (this.pendingCount() > 0 || this.hitPointChanges().length > 0));

  readonly hasFilter = computed(() => this.search().length > 0 || this.activeKeywords().length > 0);

  /** Campaign casts, filtered in memory (the shell already has them). */
  readonly campaignCasts = computed<CampaignCastInstance[]>(() => {
    const term = this.search().trim().toLowerCase();
    const keywords = this.activeKeywords().map(keyword => keyword.toLowerCase());
    const matchAll = this.matchAll();

    return (this.shellSvc.campaign()?.casts ?? []).filter(cast => {
      if (term && !this.matchesTerm(cast, term)) return false;
      if (!keywords.length) return true;

      const castKeywords = cast.keywords.map(keyword => keyword.toLowerCase());
      return matchAll
        ? keywords.every(keyword => castKeywords.includes(keyword))
        : keywords.some(keyword => castKeywords.includes(keyword));
    });
  });

  ngOnInit(): void {
    this.castIndex.reset({ search: '', keywords: [], matchAll: false });
    this.seedPickedFromTarget();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    // 250ms keeps a fast typist to one request per pause.
    this.searchTimer = window.setTimeout(() => this.applyFilter(), 250);
  }

  toggleKeyword(keyword: string): void {
    this.activeKeywords.update(current => current.includes(keyword)
      ? current.filter(active => active !== keyword)
      : [...current, keyword]);
    this.applyFilter();
  }

  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  toggleMatchAll(): void {
    this.matchAll.update(value => !value);
    this.applyFilter();
  }

  clearFilter(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.search.set('');
    this.activeKeywords.set([]);
    this.applyFilter();
  }

  /** Fetches the next set of the library ("Next set" — paged data). */
  loadNextSet(): void {
    this.castIndex.loadNextSet();
  }

  canLoadNextSet(): boolean {
    return this.castIndex.canLoadNextSet();
  }

  // ── Picking ──────────────────────────────────────────────────────────────
  addFromInstance(cast: CampaignCastInstance): void {
    this.addCopy('instance', cast.sourceCastId, cast.instanceId, cast);
  }

  addFromLibrary(cast: CastIndexItem): void {
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

  /** The DM dialled a card's max hit points. */
  setHp(key: string, hp: number): void {
    this.picked.update(current => current.map(card => card.key === key ? { ...card, hp } : card));
  }

  /**
   * Adds the picked cards: duplicates repeat, campaign picks keep their instance,
   * and a row seeded from the group being added to is only topped up by the
   * difference — its counter shows the group's resulting count, so writing the
   * whole count again would double what the group already holds.
   *
   * Every card carries its max hit points with it, and a card without one stops
   * the run here as well as on the button (see `hpMissing`): nothing enters the
   * fight with no hit points to take.
   */
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

  /** One card as the encounter's own add / spot calls take it. */
  private requestOf(card: PickedCard): SpotCombatantRequest {
    return {
      combatantType: 'cast',
      sourceCastId: card.castId,
      // Library picks carry no campaign instance; an empty value is left out.
      originCampaignCastInstanceId: card.instanceId || undefined,
    };
  }

  /** Index rows only carry the tile fields; the rest of the card shape stays neutral. */
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
      lostHitPoints: 0,
      tempHitPoints: 0,
      voicePlacement: [],
      dmNotes: ''
    };
  }

  private applyFilter(): void {
    this.castIndex.reset({
      search: this.search(),
      keywords: this.activeKeywords(),
      matchAll: this.matchAll(),
    });
  }

  /**
   * Adds one copy of a card; the card face comes along so the picked row can draw
   * it. A card picked here starts at nothing held (`seedCount: 0`) and with no rows
   * of its own (`combatantIds: []`), so every copy of it is new. Its hit points
   * start at the cast's own max, which is 0 for a library card (the index carries
   * none), and the DM then has to dial a value in before the group can be added.
   */
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
          }];
    });
  }

  /**
   * Seeds the picked panel with the cards of the group being added to, so the DM
   * sees what they already chose for it. The rows use the same keys as `addCopy`
   * (`instance:<instance id>` for a campaign cast, `cast:<library id>` otherwise),
   * so picking the same card again tops the row up instead of listing it twice;
   * each row's `seedCount` keeps the group's own copies out of the write, and its
   * `combatantIds` are the rows a corrected hit-point value has to reach.
   */
  private seedPickedFromTarget(): void {
    const target = this.shellSvc.encounterPickerTarget();
    if (target.mode !== 'existing') return;

    const seeded = new Map<string, PickedCard>();
    for (const combatant of target.spotCombatants) {
      // The encounter's cast is what a group holds, so the party's own rows (the
      // shared mapper leaves them out too) are not the picker's business.
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
        // The row's own hit points are what the group is holding: that is what the
        // counter shows, and what a dialled value is compared against.
        hp: combatant.maxHitPoints,
        seedHp: combatant.maxHitPoints,
        combatantIds: [combatant.id],
      });
    }

    this.picked.set([...seeded.values()]);
  }

  /** The picked-list key of an encounter combatant (the shared scheme: see `castCardKey`). */
  private keyOf(combatant: EncounterCombatant): string {
    return castCardKey(combatant);
  }

  private matchesTerm(cast: CampaignCastInstance, term: string): boolean {
    return cast.name.toLowerCase().includes(term)
      || cast.role.toLowerCase().includes(term)
      || cast.race.toLowerCase().includes(term)
      || cast.keywords.some(keyword => keyword.toLowerCase().includes(term));
  }
}
