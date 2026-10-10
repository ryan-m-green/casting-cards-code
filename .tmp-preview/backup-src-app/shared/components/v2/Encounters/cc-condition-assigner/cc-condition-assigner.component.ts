import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { CardCondition, D5E_CONDITIONS, conditionRingColor } from '../../../../models/condition.model';

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
  readonly subject = input.required<ConditionSubject>();
  readonly conditions = input<CardCondition[]>([]);

  readonly conditionsChanged = output<CardCondition[]>();

  readonly custom = signal('');
  readonly saving = signal(false);
  readonly error = signal('');

  readonly standard = D5E_CONDITIONS;

  ringColor(name: string): string {
    return conditionRingColor(name);
  }

  isActive(name: string): boolean {
    return this.conditions().some(condition => condition.conditionName === name);
  }

  assign(name: string): void {
    const conditionName = name.trim();
    if (!conditionName || this.isActive(conditionName) || this.saving()) return;

    this.error.set('');
    this.saving.set(true);

    this.conditionsApi.assign(this.campaignId(), this.subject(), conditionName).subscribe({
      next: condition => {
        this.saving.set(false);
        this.custom.set('');
        this.conditionsChanged.emit([
          ...this.conditions().filter(read => read.id !== condition.id),
          condition,
        ]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not assign the condition.');
      },
    });
  }
}
