import { Component, OnInit, OnDestroy, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConditionSubject } from '../../../../../core/card-condition.service';
import {
  EncounterCombatant, EncounterService, UpdateEncounterCombatantRequest
} from '../../../../../core/encounter.service';
import { combatantAsCast } from '../../../../../core/encounter-combatant.mapper';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CardCondition } from '../../../../models/condition.model';
import { PlayerCardWithDetails } from '../../../../models/player-card.model';
import { CcCastCardComponent } from '../../../Shared/cc-cast-card/cc-cast-card.component';
import { CcPlayerCardComponent } from '../../carddeck/cc-player-card/cc-player-card.component';
import { CcDialCounterComponent } from '../../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcRingConditionComponent } from '../cc-ring-condition/cc-ring-condition.component';
import { CcConditionAssignerComponent } from '../cc-condition-assigner/cc-condition-assigner.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';

const WRITE_SETTLE_MS = 400;

const HP_DIALS = 3;

const TEMP_DIALS = 3;

type CastDetailsTab = 'hp' | 'conditions';

@Component({
  selector: 'cc-combatant-details',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CcCastCardComponent, CcPlayerCardComponent,
    CcDialCounterComponent, CcRingConditionComponent, CcConditionAssignerComponent, CcTextboxComponent
  ],
  templateUrl: './cc-combatant-details.component.html',
  styleUrl: './cc-combatant-details.component.scss'
})
export class CcCombatantDetailsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private encounterApi = inject(EncounterService);
  private shellSvc = inject(CampaignShellService);
  private hub = inject(CampaignHubService);

  readonly campaignId = input.required<string>();
  readonly encounterId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');
  readonly spotName = input<string>('');
  readonly combatants = input.required<EncounterCombatant[]>();
  readonly index = input<number>(0);
  readonly readOnly = input(false);

  readonly hpDials = HP_DIALS;

  readonly tempDials = TEMP_DIALS;

  readonly panelIndex = signal(0);

  readonly tab = signal<CastDetailsTab>('hp');

  readonly editingNotes = signal(false);

  readonly notesDraft = signal('');

  readonly savingNotes = signal(false);

  readonly notesField = viewChild<CcTextboxComponent>('notesField');

  private readonly cards = signal<EncounterCombatant[]>([]);

  readonly current = computed(() => this.cards()[this.panelIndex()] ?? this.cards()[0]);

  readonly panelCount = computed(() => this.cards().length);

  readonly hasArrows = computed(() => this.cards().length > 1);

  readonly isPlayer = computed(() => this.current()?.combatantType === 'player');

  readonly currentHp = computed(() => {
    const card = this.current();
    return card ? Math.max(0, card.maxHitPoints - card.lostHitPoints) : 0;
  });

  readonly hpDialHeld = computed(() => (this.current()?.tempHitPoints ?? 0) > 0);

  readonly tempDialHeld = computed(() => this.currentHp() === 0 && !this.hpDialHeld());

  readonly isDefeated = computed(() => {
    const card = this.current();
    if (!card) return false;

    return card.isDefeated || (card.maxHitPoints > 0 && this.currentHp() === 0);
  });

  readonly error = signal('');

  private readonly pending = new Map<string, UpdateEncounterCombatantRequest>();
  private flushTimer = 0;

  private readonly playerCards = signal<PlayerCardWithDetails[]>([]);
  private loadingPlayerCards = false;
  private readonly subs = new Subscription();

  readonly playerMember = computed(() => {
    const cardId = this.current()?.playerCardId;
    return cardId ? this.playerCards().find(card => card.id === cardId) ?? null : null;
  });

  private readonly conditionsByCard = signal<Map<string, CardCondition[]>>(new Map());

  readonly currentConditions = computed<CardCondition[]>(() => {
    const card = this.current();
    if (!card) return [];

    const read = this.conditionsByCard().get(card.id);
    if (read) return read;

    return this.isPlayer() ? this.playerMember()?.conditions ?? [] : [];
  });

  readonly playerSubject = computed<ConditionSubject | null>(() => {
    const memberId = this.playerMember()?.id;
    return memberId ? { kind: 'player', playerCardId: memberId } : null;
  });

  readonly castSubject = computed<ConditionSubject>(() => ({
    kind: 'combatant',
    encounterId: this.encounterId(),
    combatantId: this.current()?.id ?? '',
  }));

  constructor() {
    effect(() => {
      this.cards.set(this.combatants());

      untracked(() => {
        this.playerCards.set([]);
        this.loadingPlayerCards = false;
        this.conditionsByCard.set(new Map());

        if (this.current()?.combatantType === 'player') this.loadPlayerCards();
      });
    });
    effect(() => this.panelIndex.set(this.index()));
    effect(() => {
      this.panelIndex();

      untracked(() => {
        this.editingNotes.set(false);
        this.notesDraft.set('');
        this.savingNotes.set(false);
      });
    });
    effect(() => { if (this.isPlayer()) this.loadPlayerCards(); });
    effect(() => {
      const card = this.current();
      if (!card || this.isPlayer() || this.conditionsByCard().has(card.id)) return;
      this.loadCastConditions(card.id);
    });
  }

  ngOnInit(): void {
    this.subs.add(this.hub.on('ConditionAssigned', 'cc-combatant-details', event => {
      if (!event) return;

      this.playerCards.update(cards => cards.map(card => card.id === event.playerCardId
        ? {
            ...card,
            conditions: [
              ...card.conditions,
              {
                id: event.conditionId,
                playerCardId: event.playerCardId,
                conditionName: event.conditionName,
                assignedAt: event.assignedAt,
              },
            ],
          }
        : card));
    }));

    this.subs.add(this.hub.on('ConditionRemoved', 'cc-combatant-details', event => {
      if (!event) return;

      this.playerCards.update(cards => cards.map(card => card.id === event.playerCardId
        ? { ...card, conditions: card.conditions.filter(condition => condition.id !== event.conditionId) }
        : card));
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.clearTimeout(this.flushTimer);
    this.flush();
  }

  step(direction: -1 | 1): void {
    const next = this.panelIndex() + direction;
    if (next < 0 || next >= this.cards().length) return;

    this.flush();
    this.panelIndex.set(next);
  }

  asCast(card: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(card, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

  setCurrentHp(current: number): void {
    const card = this.current();
    if (!card) return;

    const lost = Math.max(0, card.maxHitPoints - current);
    const defeated = card.maxHitPoints > 0 && lost >= card.maxHitPoints;

    if (defeated && !card.isDefeated) {
      this.conditionsByCard.update(read => new Map(read).set(card.id, []));
    }

    if (defeated) this.clearCapturedAndEscaped(card);

    this.queue(defeated === card.isDefeated
      ? { lostHitPoints: lost }
      : { lostHitPoints: lost, isDefeated: defeated });
  }

  private clearCapturedAndEscaped(card: EncounterCombatant): void {
    if (!card.isCaptured && !card.isEscaped) return;

    this.cards.update(list => list.map(entry => entry.id === card.id
      ? { ...entry, isCaptured: false, isEscaped: false }
      : entry));
    this.queue({ isCaptured: false, isEscaped: false });
  }

  setTempHp(temp: number): void {
    this.queue({ tempHitPoints: Math.max(0, temp) });
  }

  setTab(tab: CastDetailsTab): void {
    this.tab.set(tab);
  }

  startNotesEdit(): void {
    const card = this.current();
    if (!card) return;

    this.notesDraft.set(card.notes ?? '');
    this.editingNotes.set(true);
    setTimeout(() => this.notesField()?.focus());
  }

  cancelNotesEdit(): void {
    this.editingNotes.set(false);
    this.notesDraft.set('');
  }

  saveNotes(): void {
    const card = this.current();
    if (!card || this.savingNotes()) return;

    const notes = this.notesDraft();
    this.savingNotes.set(true);
    this.error.set('');

    this.encounterApi.updateCombatant(this.campaignId(), this.encounterId(), card.id, { notes })
      .subscribe({
        next: row => {
          this.cards.update(list => list.map(entry => entry.id === row.id ? { ...entry, notes: row.notes } : entry));
          this.savingNotes.set(false);
          this.editingNotes.set(false);
          this.notesDraft.set('');
          this.shellSvc.publishEncounterChanged(this.encounterId());
        },
        error: () => {
          this.savingNotes.set(false);
          this.error.set('Could not save the notes.');
        },
      });
  }

  setCaptured(): void {
    const card = this.current();
    if (!card || this.isDefeated()) return;

    this.applyStatus(card.isCaptured
      ? { isCaptured: false }
      : { isCaptured: true, isEscaped: false });
  }

  setEscaped(): void {
    const card = this.current();
    if (!card || this.isDefeated()) return;

    this.applyStatus(card.isEscaped
      ? { isEscaped: false }
      : { isEscaped: true, isCaptured: false });
  }

  private applyStatus(patch: UpdateEncounterCombatantRequest): void {
    const card = this.current();
    if (!card) return;

    this.cards.update(list => list.map(entry => entry.id === card.id ? { ...entry, ...patch } : entry));
    this.queue(patch);
  }

  onConditionsChanged(conditions: CardCondition[]): void {
    const card = this.current();
    if (!card) return;

    this.conditionsByCard.update(read => new Map(read).set(card.id, conditions));
  }

  private queue(patch: UpdateEncounterCombatantRequest): void {
    const card = this.current();
    if (!card) return;

    this.pending.set(card.id, { ...this.pending.get(card.id), ...patch });
    window.clearTimeout(this.flushTimer);
    this.flushTimer = window.setTimeout(() => this.flush(), WRITE_SETTLE_MS);
  }

  private flush(): void {
    const writes = [...this.pending.entries()];
    this.pending.clear();
    if (!writes.length) return;

    forkJoin(writes.map(([combatantId, patch]) =>
      this.encounterApi.updateCombatant(this.campaignId(), this.encounterId(), combatantId, patch)
    )).subscribe({
      next: rows => {
        const written = new Map(rows.map(row => [row.id, row]));
        this.cards.update(list => list.map(card => written.get(card.id) ?? card));
        this.shellSvc.publishEncounterChanged(this.encounterId());
      },
      error: () => this.error.set('Could not save the hit points.'),
    });
  }

  private loadCastConditions(combatantId: string): void {
    this.encounterApi.getCombatantConditions(this.campaignId(), this.encounterId(), combatantId).subscribe({
      next: conditions => this.conditionsByCard.update(read => new Map(read).set(combatantId, conditions)),
      error: () => this.error.set('Could not load the conditions.'),
    });
  }

  private loadPlayerCards(): void {
    if (this.playerCards().length || this.loadingPlayerCards) return;
    this.loadingPlayerCards = true;

    this.http.get<PlayerCardWithDetails[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards`)
      .subscribe({
        next: cards => {
          this.loadingPlayerCards = false;
          this.playerCards.set(cards);
        },
        error: () => {
          this.loadingPlayerCards = false;
          this.error.set('Could not load the player card.');
        },
      });
  }
}
