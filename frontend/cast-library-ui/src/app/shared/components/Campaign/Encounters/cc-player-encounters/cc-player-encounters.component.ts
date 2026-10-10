import {
  Component, ChangeDetectionStrategy, OnDestroy, OnInit,
  computed, inject, input, signal
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignEncounter, EncounterCombatant, EncounterService } from '../../../../../core/encounter.service';
import { castCardKey, combatantAsCast, distinctCastCards } from '../../../../../core/encounter-combatant.mapper';
import { PlayerFieldJournalEntry, PlayerFieldJournalService } from '../../../../../core/player-field-journal.service';
import { EncounterCelebrationService } from '../../../../../core/encounter-celebration.service';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { FieldJournalCardTarget, CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CcEncounterCircleComponent, RingCombatantSelection } from '../cc-encounter-circle/cc-encounter-circle.component';

const RING_HOLD_MS = 900;
const RING_IN_MS = 1400;
const RING_FADE_MS = 700;

@Component({
  selector: 'cc-player-encounters',
  standalone: true,
  imports: [CcEncounterCircleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-player-encounters.component.html',
  styleUrl: './cc-player-encounters.component.scss'
})
export class CcPlayerEncountersComponent implements OnInit, OnDestroy {
  private encounterApi = inject(EncounterService);
  private journalApi = inject(PlayerFieldJournalService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private celebration = inject(EncounterCelebrationService);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  private readonly mark = publishGridAreaMark('bottom-left', 'content', {
    title: () => ['Encounters'],
    icon: { path: '/spear_shield_weaponry.svg', width: 38, height: 38 },
  });

  readonly encounters = signal<CampaignEncounter[]>([]);
  readonly entries = signal<PlayerFieldJournalEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly activeEncounter = computed(() =>
    this.encounters().find(entry => entry.status === 'active') ?? null);

  private readonly heldEncounter = signal<CampaignEncounter | null>(null);

  readonly displayedEncounter = computed(() => this.activeEncounter() ?? this.heldEncounter());

  readonly ringOpacity = signal(0);

  readonly ringEntering = signal(false);

  private ringTimer = 0;
  private enterTimer = 0;

  readonly standbyEncounter = computed<CampaignEncounter>(() => ({
    id: '',
    campaignId: this.campaignId(),
    sequenceNumber: 0,
    name: '',
    status: 'planned',
    roundNumber: 0,
    spots: [],
  }));

  readonly turnBanner = computed(() => {
    const encounter = this.activeEncounter();
    if (!encounter) return '';

    const spots = encounter.spots ?? [];
    const count = spots.length;
    if (!count) return '';

    const index = Math.max(spots.findIndex(spot => spot.id === encounter.currentSpotId), 0);
    const spot = spots[index];
    const name = spot?.groupName || spot?.combatants[0]?.displayName || 'Group';
    const round = encounter.roundNumber && encounter.roundNumber > 0 ? encounter.roundNumber : 1;

    return `Round ${round} · turn ${index + 1} of ${count} · ${name}`;
  });

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.reload();

    this.subs.add(this.hub.on('EncounterUpdated', 'cc-player-encounters', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('EncounterTurnChanged', 'cc-player-encounters', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('EncounterCombatantUpdated', 'cc-player-encounters', event => this.onEncounterEvent(event?.campaignId)));
    this.subs.add(this.hub.on('TrophyAwarded', 'cc-player-encounters', event => this.onEncounterEvent(event?.campaignId)));

    this.subs.add(this.hub.on('FieldJournalUpdated', 'cc-player-encounters', event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      this.reloadEntries();
    }));

    this.subs.add(this.celebration.finished$.subscribe(() => this.syncRing(true)));
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.ringTimer);
    window.clearTimeout(this.enterTimer);
    this.subs.unsubscribe();
  }

  private syncRing(now = false): void {
    const active = this.activeEncounter();

    if (active) {
      window.clearTimeout(this.ringTimer);
      this.ringTimer = 0;

      if (this.heldEncounter()?.id === active.id) {
        this.ringOpacity.set(1);
        return;
      }

      this.heldEncounter.set(active);
      this.ringEntering.set(true);
      this.ringOpacity.set(0);
      window.requestAnimationFrame(() => this.ringOpacity.set(1));

      window.clearTimeout(this.enterTimer);
      this.enterTimer = window.setTimeout(() => this.ringEntering.set(false), RING_IN_MS);
      return;
    }

    if (!this.heldEncounter()) return;

    window.clearTimeout(this.ringTimer);

    const leave = () => {
      if (this.celebration.active()) return;

      window.clearTimeout(this.enterTimer);
      this.ringEntering.set(false);
      this.ringOpacity.set(0);
      window.clearTimeout(this.ringTimer);
      this.ringTimer = window.setTimeout(() => this.heldEncounter.set(null), RING_FADE_MS);
    };

    if (now) {
      leave();
      return;
    }

    this.ringTimer = window.setTimeout(leave, RING_HOLD_MS);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');

    this.encounterApi.list(this.campaignId()).subscribe({
      next: encounters => {
        this.encounters.set(encounters ?? []);
        this.syncRing();

        this.loading.set(false);
        this.gridLoad.report('bottom-left', 'content');
      },
      error: () => {
        this.error.set('Could not load the party\'s encounters.');
        this.loading.set(false);
        this.gridLoad.report('bottom-left', 'content');
      },
    });

    this.reloadEntries();
  }

  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

  onFightCardSelected(selection: RingCombatantSelection): void {
    const encounter = this.activeEncounter();
    if (!encounter) return;

    const pressed = selection.cards[selection.index];
    if (!pressed) return;

    if (pressed.combatantType === 'player') {
      this.shellSvc.openCombatantDetailsDrawer({
        campaignId: this.campaignId(),
        encounterId: encounter.id,
        portalColor: this.portalColor(),
        spotName: selection.spotName,
        combatants: selection.cards,
        index: selection.index,
        readOnly: true,
      });
      return;
    }

    const distinct = distinctCastCards(
      selection.cards.filter(card => card.combatantType !== 'player'));
    if (!distinct.length) return;

    const pressedKey = castCardKey(pressed);
    const startIndex = Math.max(distinct.findIndex(card => card.key === pressedKey), 0);

    this.shellSvc.openFieldJournalEntryDrawer({
      campaignId: this.campaignId(),
      portalColor: this.portalColor(),
      encounterId: encounter.id,
      encounterName: encounter.name || `Encounter ${encounter.sequenceNumber}`,
      cards: distinct.map(card => this.toCardTarget(card.combatant, encounter.id)),
      index: startIndex,
    });
  }

  private toCardTarget(combatant: EncounterCombatant, encounterId: string): FieldJournalCardTarget {
    const key = castCardKey(combatant);

    return {
      cardKey: key,
      combatantId: combatant.id,
      castInstanceId: combatant.originCampaignCastInstanceId ?? null,
      sourceCastId: combatant.sourceCastId ?? null,
      cast: this.asCast(combatant),
      notes: this.existingNotes(encounterId, key),
    };
  }

  private existingNotes(encounterId: string, cardKey: string): string {
    const forCard = this.entries().filter(entry => entry.cardKey === cardKey);
    const current = forCard.find(entry => entry.encounterId === encounterId);

    return current ? current.notes : (forCard[0]?.notes ?? '');
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
