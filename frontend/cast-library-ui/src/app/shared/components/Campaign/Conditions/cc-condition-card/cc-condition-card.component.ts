import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { conditionRingColorOf } from '../../../../models/condition.model';
import { CcCardWatermarkComponent } from '../../CardNavigation/cc-card-watermark/cc-card-watermark.component';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../../Shared/cc-delete-button/cc-delete-button.component';

@Component({
  selector: 'cc-condition-card',
  standalone: true,
  imports: [CcCardWatermarkComponent, CcEditButtonComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-full]': "size() === 'full'" },
  templateUrl: './cc-condition-card.component.html',
  styleUrl: './cc-condition-card.component.scss',
})
export class CcConditionCardComponent {
  readonly condition = input.required<ConditionEntry>();

  readonly portalColor = input<string>('#6e28d0');

  /** Whether the card wears the purple selection check a picker uses. */
  readonly selected = input(false);

  /** How the card is drawn: a picker's mini card, or a library's full-sized card. */
  readonly size = input<'mini' | 'full'>('mini');

  /** Whether the card hosts the library's edit (bottom-left) and delete (bottom-right) buttons. */
  readonly showActions = input(false);

  readonly open = output<ConditionEntry>();

  readonly editClick = output<void>();

  readonly deleteClick = output<void>();

  readonly name = computed(() => this.condition().name);

  readonly ringColor = computed(() => conditionRingColorOf(this.condition().name, this.condition().color));
}
