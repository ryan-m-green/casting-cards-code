import {
  Component, ChangeDetectionStrategy, ElementRef, Injector, OnDestroy, OnInit,
  afterNextRender, computed, effect, inject, input, signal, viewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { CampaignEncounter, EncounterCombatant, EncounterService } from '../../../../../core/encounter.service';
import {
  castCardsOf, castSpotsOf, combatantAsCast, distinctCastCards
} from '../../../../../core/encounter-combatant.mapper';
import { PlayerFieldJournalEntry, PlayerFieldJournalService } from '../../../../../core/player-field-journal.service';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CcCastCardComponent } from '../../../Shared/cc-cast-card/cc-cast-card.component';
import { CcRolodexFrameComponent } from '../../Shared/cc-rolodex-frame/cc-rolodex-frame.component';
import { CcDynamicFiltersComponent, DynamicFilter } from '../../Shared/cc-dynamic-filters/cc-dynamic-filters.component';
import { CcEncounterFateComponent, EncounterFate } from '../../Shared/cc-encounter-fate/cc-encounter-fate.component';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';

interface JournalCard {
  key: string;
  combatant: EncounterCombatant;
  count: number;
  downCount: number;
  capturedCount: number;
  escapedCount: number;
  fates: EncounterFate[];
  hasNote: boolean;
  encounterNames: string[];
  latestEncounterId: string;
}

type JournalFilter = 'all' | 'to-note' | 'noted' | 'down' | 'up';

@Component({
  selector: 'cc-player-field-journal',
  standalone: true,
  imports: [CcCastCardComponent, CcRolodexFrameComponent, CcDynamicFiltersComponent, CcEncounterFateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-player-field-journal.component.html',
  styleUrl: './cc-player-field-journal.component.scss'
})
export class CcPlayerFieldJournalComponent implements OnInit, OnDestroy {
  private encounterApi = inject(EncounterService);
  private journalApi = inject(PlayerFieldJournalService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private injector = inject(Injector);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  private readonly mark = publishGridAreaMark('bottom-middle', 'content', {
    title: () => ['Field Journal'],
    icon: { path: '/book_goblin_writing.svg', width: 48, height: 32 },
  });

  readonly encounters = signal<CampaignEncounter[]>([]);
  readonly entries = signal<PlayerFieldJournalEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filter = signal<JournalFilter>('all');

  readonly whereLabel = 'Previous encounters';

  private readonly rowRef = viewChild<ElementRef<HTMLElement>>('journalRow');
  private swiper?: Swiper;
  private lastFilter: JournalFilter = 'all';

  constructor() {
    effect(() => {
      const row = this.rowRef()?.nativeElement;
      const filter = this.filter();

      this.visibleCards().length;

      afterNextRender(() => {
        if (!row) {
          this.destroySwiper();
          return;
        }

        this.mountSwiper(row);

        if (filter !== this.lastFilter) {
          this.swiper?.slideTo(0, 0);
          this.lastFilter = filter;
        }
      }, { injector: this.injector });
    });
  }

  readonly cards = computed<JournalCard[]>(() => {
    const notedKeys = new Set(
      this.entries().filter(entry => entry.notes.trim().length > 0).map(entry => entry.cardKey));
    const byKey = new Map<string, JournalCard>();

    for (const encounter of this.encounters()) {
      const encounterName = encounter.name || `Encounter ${encounter.sequenceNumber}`;

      for (const spot of castSpotsOf(encounter.spots ?? [])) {
        for (const card of distinctCastCards(castCardsOf(spot))) {
          const existing = byKey.get(card.key);

          if (existing) {
            existing.count += card.count;
            existing.downCount += card.downCount;
            existing.capturedCount += card.capturedCount;
            existing.escapedCount += card.escapedCount;
            if (!existing.encounterNames.includes(encounterName)) existing.encounterNames.push(encounterName);
            continue;
          }

          byKey.set(card.key, {
            key: card.key,
            combatant: card.combatant,
            count: card.count,
            downCount: card.downCount,
            capturedCount: card.capturedCount,
            escapedCount: card.escapedCount,
            fates: [],
            hasNote: false,
            encounterNames: [encounterName],
            latestEncounterId: encounter.id,
          });
        }
      }
    }

    return [...byKey.values()].map(card => ({
      ...card,
      hasNote: notedKeys.has(card.key),
      fates: this.fatesOf(card),
    }));
  });

  readonly visibleCards = computed(() => {
    const filter = this.filter();
    return this.cards().filter(card =>
      filter === 'all' ? true
        : filter === 'to-note' ? !card.hasNote
        : filter === 'noted' ? card.hasNote
        : filter === 'down' ? card.downCount > 0
        : card.downCount === 0);
  });

  readonly filters = computed<DynamicFilter[]>(() => {
    const cards = this.cards();
    const active = this.filter();
    const noted = cards.filter(card => card.hasNote).length;
    const down = cards.filter(card => card.downCount > 0).length;

    const chip = (key: JournalFilter, label: string, count: number): DynamicFilter => ({
      key,
      label,
      count,
      on: active === key,
      title: `${count} ${count === 1 ? 'card' : 'cards'}`,
    });

    return [
      chip('all', 'All', cards.length),
      chip('to-note', 'To note', cards.length - noted),
      chip('noted', 'Noted', noted),
      chip('down', 'Put down', down),
      chip('up', 'Standing', cards.length - down),
    ];
  });

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.reload();

    this.subs.add(this.hub.on('EncounterUpdated', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('EncounterCombatantUpdated', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('TrophyAwarded', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('EncounterEnded', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));

    this.subs.add(this.hub.on('FieldJournalUpdated', 'cc-player-field-journal', event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      this.reloadEntries();
    }));
  }

  ngOnDestroy(): void {
    this.destroySwiper();
    this.subs.unsubscribe();
  }

  setFilter(key: string): void {
    this.filter.set(key as JournalFilter);
  }

  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

  cardTitle(card: JournalCard): string {
    const copies = card.count === 1 ? '1 copy' : `${card.count} copies`;
    const down = card.downCount === 0 ? 'none down' : `${card.downCount} down`;
    return `${copies} met — ${down}`;
  }

  metInLabel(card: JournalCard): string {
    const [first] = card.encounterNames;
    if (!first) return '';
    return card.encounterNames.length === 1
      ? `Met in ${first}`
      : `Met in ${first} +${card.encounterNames.length - 1}`;
  }

  private fatesOf(card: JournalCard): EncounterFate[] {
    const fates: EncounterFate[] = [];
    if (card.downCount > 0) fates.push('defeated');
    if (card.capturedCount > 0) fates.push('captured');
    if (card.escapedCount > 0) fates.push('fled');
    return fates;
  }

  openChronicleFor(card: JournalCard): void {
    this.shellSvc.openChronicleDrawerWithSearch(this.asCast(card.combatant).name);
  }

  openCard(card: JournalCard): void {
    const forCard = this.entries().filter(entry => entry.cardKey === card.key);
    const encounterId = forCard[0]?.encounterId ?? card.latestEncounterId;
    const notes = forCard.find(entry => entry.encounterId === encounterId)?.notes ?? (forCard[0]?.notes ?? '');

    this.shellSvc.openFieldJournalEntryDrawer({
      campaignId: this.campaignId(),
      portalColor: this.portalColor(),
      encounterId,
      encounterName: this.encounterName(encounterId),
      cards: [{
        cardKey: card.key,
        combatantId: card.combatant.id,
        castInstanceId: card.combatant.originCampaignCastInstanceId ?? null,
        sourceCastId: card.combatant.sourceCastId ?? null,
        cast: this.asCast(card.combatant),
        notes,
      }],
      index: 0,
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');

    this.encounterApi.list(this.campaignId()).subscribe({
      next: encounters => {
        this.encounters.set(encounters ?? []);
        this.loading.set(false);
        this.gridLoad.report('bottom-middle', 'content');
      },
      error: () => {
        this.error.set('Could not load your field journal.');
        this.loading.set(false);
        this.gridLoad.report('bottom-middle', 'content');
      },
    });

    this.reloadEntries();
  }

  private encounterName(encounterId: string): string {
    const encounter = this.encounters().find(entry => entry.id === encounterId);
    return encounter ? (encounter.name || `Encounter ${encounter.sequenceNumber}`) : '';
  }

  private onEncounterEvent(campaignId: string | undefined): void {
    if (!campaignId || campaignId !== this.campaignId()) return;
    this.reload();
  }

  private reloadEntries(): void {
    this.journalApi.list(this.campaignId()).subscribe({
      next: entries => this.entries.set(entries ?? []),
      error: () => this.entries.set([]),
    });
  }

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 12,
    centeredSlides: true,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    observeParents: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  private mountSwiper(element: HTMLElement): void {
    if (this.swiper) {
      if (this.swiper.el === element) {
        this.swiper.update();
        return;
      }
      this.destroySwiper();
    }

    this.swiper = new Swiper(element, CcPlayerFieldJournalComponent.SWIPER_OPTIONS);
  }

  private destroySwiper(): void {
    if (!this.swiper) return;

    this.swiper.destroy(true, true);
    this.swiper = undefined;
  }
}
