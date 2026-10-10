import {
  Component, ChangeDetectionStrategy, OnDestroy, OnInit,
  computed, inject, input, signal
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignEncounter, EncounterCombatant, EncounterService } from '../../../../../core/encounter.service';
import {
  castCardsOf, castSpotsOf, combatantAsCast, distinctCastCards
} from '../../../../../core/encounter-combatant.mapper';
import { PlayerFieldJournalEntry, PlayerFieldJournalService } from '../../../../../core/player-field-journal.service';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';

interface JournalCard {
  key: string;
  combatant: EncounterCombatant;
  count: number;
  downCount: number;
  hasNote: boolean;
  encounterNames: string[];
  latestEncounterId: string;
}

type JournalFilter = 'all' | 'down' | 'up' | 'noted';

@Component({
  selector: 'cc-player-field-journal',
  standalone: true,
  imports: [CcSimpleCastCardComponent],
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

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  private readonly mark = publishGridAreaMark('bottom-middle', 'content', {
    title: () => ['Field Journal'],
    icon: { path: '/feather_quill_writing_tool.svg', width: 34, height: 34 },
  });

  readonly encounters = signal<CampaignEncounter[]>([]);
  readonly entries = signal<PlayerFieldJournalEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filter = signal<JournalFilter>('all');

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
            if (!existing.encounterNames.includes(encounterName)) existing.encounterNames.push(encounterName);
            continue;
          }

          byKey.set(card.key, {
            key: card.key,
            combatant: card.combatant,
            count: card.count,
            downCount: card.downCount,
            hasNote: false,
            encounterNames: [encounterName],
            latestEncounterId: encounter.id,
          });
        }
      }
    }

    return [...byKey.values()].map(card => ({ ...card, hasNote: notedKeys.has(card.key) }));
  });

  readonly visibleCards = computed(() => {
    const filter = this.filter();
    return this.cards().filter(card =>
      filter === 'all' ? true
        : filter === 'down' ? card.downCount > 0
        : filter === 'up' ? card.downCount === 0
        : card.hasNote);
  });

  readonly notedCount = computed(() => this.cards().filter(card => card.hasNote).length);

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.reload();

    this.subs.add(this.hub.on('EncounterUpdated', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('EncounterCombatantUpdated', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('TrophyAwarded', 'cc-player-field-journal', event => this.onEncounterEvent(event?.campaignId)));

    this.subs.add(this.hub.on('FieldJournalUpdated', 'cc-player-field-journal', event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      this.reloadEntries();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  setFilter(filter: JournalFilter): void {
    this.filter.set(filter);
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
}
