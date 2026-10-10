import { Component, OnInit, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PlayerFieldJournalService } from '../../../../../core/player-field-journal.service';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { FieldJournalCardTarget } from '../../../../../core/campaign-shell.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CardCondition } from '../../../../models/condition.model';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcRingConditionComponent } from '../../Encounters/cc-ring-condition/cc-ring-condition.component';

const WRITE_SETTLE_MS = 600;

@Component({
  selector: 'cc-field-journal-entry-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcCastCardComponent, CcRingConditionComponent],
  templateUrl: './cc-field-journal-entry-content.component.html',
  styleUrl: './cc-field-journal-entry-content.component.scss'
})
export class CcFieldJournalEntryContentComponent implements OnInit, OnDestroy {
  private journalApi = inject(PlayerFieldJournalService);
  private conditionsApi = inject(CardConditionService);
  private hub = inject(CampaignHubService);

  readonly campaignId = input('');
  readonly portalColor = input('#6e28d0');
  readonly encounterId = input('');
  readonly encounterName = input('');
  readonly cards = input<FieldJournalCardTarget[]>([]);
  readonly index = input(0);

  readonly panelIndex = signal(0);
  readonly draft = signal('');
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');

  readonly current = computed(() => this.cards()[this.panelIndex()] ?? null);
  readonly hasArrows = computed(() => this.cards().length > 1);

  private readonly conditionsByCombatant = signal<Map<string, CardCondition[]>>(new Map());

  readonly castSubject = computed<ConditionSubject>(() => ({
    kind: 'combatant',
    encounterId: this.encounterId(),
    combatantId: this.current()?.combatantId ?? '',
  }));

  readonly currentConditions = computed<CardCondition[]>(() => {
    const card = this.current();
    return card ? this.conditionsByCombatant().get(card.combatantId) ?? [] : [];
  });

  private readonly texts = new Map<string, string>();
  private readonly persisted = new Map<string, string>();
  private trackedCards: FieldJournalCardTarget[] | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly subs = new Subscription();

  constructor() {
    effect(() => {
      const cards = this.cards();
      const start = this.index();

      untracked(() => {
        if (cards !== this.trackedCards) {
          this.trackedCards = cards;
          this.texts.clear();
          this.persisted.clear();
        }
        this.panelIndex.set(Math.min(Math.max(start, 0), Math.max(cards.length - 1, 0)));
      });
    });

    effect(() => {
      const card = this.current();
      if (!card) return;

      untracked(() => {
        if (!this.persisted.has(card.cardKey)) this.persisted.set(card.cardKey, card.notes ?? '');
        if (!this.texts.has(card.cardKey)) this.texts.set(card.cardKey, card.notes ?? '');
        this.draft.set(this.texts.get(card.cardKey) ?? '');
        this.saved.set(false);
        this.error.set('');
      });
    });

    effect(() => {
      const card = this.current();
      if (!card || !this.encounterId()) return;
      if (this.conditionsByCombatant().has(card.combatantId)) return;

      this.loadConditions(card.combatantId);
    });
  }

  ngOnInit(): void {
    this.subs.add(this.hub.on('ConditionAssigned', 'cc-field-journal-entry-content', event => {
      if (!event || event.encounterId !== this.encounterId()) return;
      if (!this.cards().some(card => card.combatantId === event.combatantId)) return;

      this.conditionsByCombatant.update(map => {
        const list = map.get(event.combatantId!) ?? [];
        const next = list.some(condition => condition.id === event.conditionId)
          ? list
          : [...list, { id: event.conditionId, conditionName: event.conditionName, assignedAt: event.assignedAt }];

        return new Map(map).set(event.combatantId!, next);
      });
    }));

    this.subs.add(this.hub.on('ConditionRemoved', 'cc-field-journal-entry-content', event => {
      if (!event || !event.combatantId || event.encounterId !== this.encounterId()) return;

      this.conditionsByCombatant.update(map => {
        const list = map.get(event.combatantId!);
        if (!list) return map;

        return new Map(map).set(
          event.combatantId!,
          list.filter(condition => condition.id !== event.conditionId));
      });
    }));

    this.subs.add(this.hub.on('FieldJournalUpdated', 'cc-field-journal-entry-content', event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      if (event.encounterId !== this.encounterId()) return;
      if (!this.cards().some(card => card.cardKey === event.cardKey)) return;
      if (this.texts.get(event.cardKey) !== this.persisted.get(event.cardKey)) return;

      this.texts.set(event.cardKey, event.notes);
      this.persisted.set(event.cardKey, event.notes);

      const card = this.current();
      if (card && card.cardKey === event.cardKey) {
        this.draft.set(event.notes);
        this.saved.set(false);
      }
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.save();
  }

  step(direction: -1 | 1): void {
    const next = this.panelIndex() + direction;
    if (next < 0 || next >= this.cards().length) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.save();
    this.panelIndex.set(next);
  }

  onInput(value: string): void {
    const card = this.current();
    if (card) this.texts.set(card.cardKey, value);

    this.draft.set(value);
    this.saved.set(false);

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.save();
    }, WRITE_SETTLE_MS);
  }

  onBlur(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.save();
  }

  private loadConditions(combatantId: string): void {
    this.conditionsApi.load(this.campaignId(), {
      kind: 'combatant',
      encounterId: this.encounterId(),
      combatantId,
    }).subscribe({
      next: conditions => this.conditionsByCombatant.update(map =>
        new Map(map).set(combatantId, conditions)),
      error: () => this.conditionsByCombatant.update(map =>
        new Map(map).set(combatantId, [])),
    });
  }

  private save(): void {
    const card = this.current();
    if (!card || !this.campaignId() || !this.encounterId()) return;

    const notes = this.texts.get(card.cardKey) ?? '';
    if (notes === (this.persisted.get(card.cardKey) ?? '')) return;

    this.saving.set(true);
    this.error.set('');

    this.journalApi.save(
      this.campaignId(),
      {
        encounterId: this.encounterId(),
        castInstanceId: card.castInstanceId,
        sourceCastId: card.sourceCastId,
      },
      notes
    ).subscribe({
      next: entry => {
        this.persisted.set(card.cardKey, entry.notes ?? notes);
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save your note.');
      },
    });
  }
}
