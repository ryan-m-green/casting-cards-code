import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { CardCondition, D5E_CONDITIONS, conditionRingColor } from '../../../../models/condition.model';

/**
 * cc-condition-assigner
 *
 * The conditions a card can be given, for the DM: the standard set as buttons, and a
 * field for anything else. A condition the card already carries reads as taken and
 * cannot be given twice, and the caller is handed the conditions as they now stand.
 *
 * This is the only place a condition is put on a card. It sits in the panel that is
 * open on the card — the encounter's combatant drawer, and the party's card in it —
 * while taking one off again is the card's own rings (see `cc-ring-condition`), which
 * is where the DM sees what the card is carrying.
 */
@Component({
  selector: 'cc-condition-assigner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-condition-assigner.component.html',
  styleUrl: './cc-condition-assigner.component.scss'
})
export class CcConditionAssignerComponent {
  private conditionsApi = inject(CardConditionService);

  readonly campaignId = input.required<string>();
  /** The card the conditions are given to. */
  readonly subject = input.required<ConditionSubject>();
  /** The conditions that card carries right now, so one it has already reads as taken. */
  readonly conditions = input<CardCondition[]>([]);

  /** The card's conditions after one was given to it. */
  readonly conditionsChanged = output<CardCondition[]>();

  /** What the DM is typing as a condition of their own. */
  readonly custom = signal('');
  readonly saving = signal(false);
  readonly error = signal('');

  /** The standard conditions, offered as buttons. */
  readonly standard = D5E_CONDITIONS;

  /** The colour a condition's ring — and so its button, once it is on the card — is made of. */
  ringColor(name: string): string {
    return conditionRingColor(name);
  }

  isActive(name: string): boolean {
    return this.conditions().some(condition => condition.conditionName === name);
  }

  /** Puts a condition on the card (the standard set and the custom field both land here). */
  assign(name: string): void {
    const conditionName = name.trim();
    if (!conditionName || this.isActive(conditionName) || this.saving()) return;

    this.error.set('');
    this.saving.set(true);

    this.conditionsApi.assign(this.campaignId(), this.subject(), conditionName).subscribe({
      next: condition => {
        this.saving.set(false);
        this.custom.set('');
        this.conditionsChanged.emit([...this.conditions(), condition]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not assign the condition.');
      },
    });
  }
}
