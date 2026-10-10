import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampaignCastInstance } from '../../../../models/cast.model';
import {
  CombatantHitPointsChange, EncounterCombatant, EncounterGroupPicked, EncounterPlaces, PickedGroupCard, SpotCombatantRequest
} from '../../../../../core/encounter.service';
import { combatantAsCast, castCardKey } from '../../../../../core/encounter-combatant.mapper';
import { CAST_INDEX_SET_SIZE, CastIndexItem, CastIndexService } from '../../../../../core/cast-index.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCounterBadgeComponent } from '../cc-counter-badge/cc-counter-badge.component';
import { CcDialCounterComponent } from '../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcEncounterPlacesComponent } from '../cc-encounter-places/cc-encounter-places.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';

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

@Component({
  selector: 'cc-encounter-group-picker',
  standalone: true,
  imports: [FormsModule, CcSimpleCastCardComponent, CcCounterBadgeComponent, CcDialCounterComponent, CcEncounterPlacesComponent, CcTextboxComponent],
  templateUrl: './cc-encounter-group-picker.component.html',
  styleUrl: './cc-encounter-group-picker.component.scss'
})
export class CcEncounterGroupPickerComponent implements OnInit {
  private shellSvc = inject(CampaignShellService);
  private castIndex = inject(CastIndexService);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');
  readonly places = input<EncounterPlaces | null>(null);

  readonly addGroup = output<EncounterGroupPicked>();

  readonly search = signal('');
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  private searchTimer = 0;

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

  readonly picked = signal<PickedCard[]>([]);

  readonly pickedCardCount = computed(() => this.picked().reduce((total, card) => total + card.count, 0));

  readonly pendingCount = computed(() =>
    this.picked().reduce((total, card) => total + Math.max(0, card.count - card.seedCount), 0));

  readonly addingToGroup = computed(() => this.shellSvc.encounterPickerTarget().mode === 'existing');

  readonly hpMissing = computed(() => this.picked().some(card => card.hp <= 0));

  readonly hitPointChanges = computed<CombatantHitPointsChange[]>(() => this.picked()
    .filter(card => card.combatantIds.length > 0 && card.hp > 0 && card.hp !== card.seedHp)
    .map(card => ({ combatantIds: card.combatantIds, maxHitPoints: card.hp })));

  readonly canAdd = computed(() => !this.hpMissing() && (this.pendingCount() > 0 || this.hitPointChanges().length > 0));

  readonly hasFilter = computed(() => this.search().length > 0 || this.activeKeywords().length > 0);

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

  loadNextSet(): void {
    this.castIndex.loadNextSet();
  }

  canLoadNextSet(): boolean {
    return this.castIndex.canLoadNextSet();
  }

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

  private matchesTerm(cast: CampaignCastInstance, term: string): boolean {
    return cast.name.toLowerCase().includes(term)
      || cast.role.toLowerCase().includes(term)
      || cast.race.toLowerCase().includes(term)
      || cast.keywords.some(keyword => keyword.toLowerCase().includes(term));
  }
}
