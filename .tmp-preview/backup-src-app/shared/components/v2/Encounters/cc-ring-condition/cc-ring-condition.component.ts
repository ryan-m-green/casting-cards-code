import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { CardCondition, conditionRingColor } from '../../../../models/condition.model';

interface ConditionRing {
  id: string;
  name: string;
  color: string;
}

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
  readonly subject = input.required<ConditionSubject>();
  readonly conditions = input<CardCondition[]>([]);
  readonly readOnly = input(false);
  readonly size = input<'large' | 'simple'>('large');

  readonly conditionsChanged = output<CardCondition[]>();

  readonly removing = signal(false);
  readonly error = signal('');

  readonly rings = computed<ConditionRing[]>(() => this.conditions().map(condition => ({
    id: condition.id,
    name: condition.conditionName,
    color: conditionRingColor(condition.conditionName),
  })));

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
