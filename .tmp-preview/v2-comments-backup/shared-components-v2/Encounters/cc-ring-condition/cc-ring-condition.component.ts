import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { CardCondition, conditionRingColor } from '../../../../models/condition.model';

/** A condition as its ring is drawn: the band's colour and what it reads. */
interface ConditionRing {
  id: string;
  name: string;
  color: string;
}

/**
 * cc-ring-condition
 *
 * The conditions a card carries, clipped onto the card as the rings a mini wears: a
 * band spanning the card's width for each one, the first low on the card and the rest
 * stacked up behind it.
 *
 * The card is projected into this component, so the rings go wherever the card goes —
 * on the encounter's panels the rings stay on the card while the tabs under it change.
 * A ring is the way off again: clicking one takes that condition off the card and the
 * caller is handed the conditions as they now stand. Giving a condition is the other
 * half of this (`cc-condition-assigner`).
 */
@Component({
  selector: 'cc-ring-condition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-ring-condition.component.html',
  styleUrl: './cc-ring-condition.component.scss'
})
export class CcRingConditionComponent {
  private conditionsApi = inject(CardConditionService);

  readonly campaignId = input.required<string>();
  /** The card the rings are clipped onto. */
  readonly subject = input.required<ConditionSubject>();
  /** The conditions that card carries right now, as the caller keeps them. */
  readonly conditions = input<CardCondition[]>([]);

  /** The card's conditions after a ring was clicked off it. */
  readonly conditionsChanged = output<CardCondition[]>();

  readonly removing = signal(false);
  readonly error = signal('');

  /**
   * The card's conditions as rings, lowest first: the first condition is the ring
   * clipped on lowest and the rest stack up the card behind it, the way the rings
   * go on a mini one at a time.
   */
  readonly rings = computed<ConditionRing[]>(() => this.conditions().map(condition => ({
    id: condition.id,
    name: condition.conditionName,
    color: conditionRingColor(condition.conditionName),
  })));

  /** Takes the ring's condition off the card. */
  remove(conditionId: string): void {
    if (this.removing()) return;

    this.error.set('');
    this.removing.set(true);

    this.conditionsApi.remove(this.campaignId(), this.subject(), conditionId).subscribe({
      next: () => {
        this.removing.set(false);
        this.conditionsChanged.emit(this.conditions().filter(condition => condition.id !== conditionId));
      },
      error: () => {
        this.removing.set(false);
        this.error.set('Could not remove the condition.');
      },
    });
  }
}
