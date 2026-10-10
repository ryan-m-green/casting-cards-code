import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Rule } from '../../../../models/rule.model';

const MAX_CARD_RULES = 2;

@Component({
  selector: 'cc-rule-card',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-rule-card.component.html',
  styleUrl: './cc-rule-card.component.scss',
})
export class CcRuleCardComponent {
  readonly rule = input.required<Rule>();

  readonly selectable = input(false);

  readonly selected = input(false);

  readonly open = output<Rule>();

  readonly ariaLabel = computed(() =>
    this.selectable() ? `${this.selected() ? 'Deselect' : 'Select'} ${this.name()}` : `Open ${this.name()}`
  );

  readonly name = computed(() => this.rule().name ?? '');

  readonly definitions = computed(() => this.rule().children ?? []);

  readonly definitionCount = computed(() => this.definitions().length);

  readonly definition = computed(() => (this.rule().definition ?? '').trim());

  readonly chapter = computed(() => {
    const count = this.definitionCount();
    if (count === 0) return 'Entry';
    return count === 1 ? 'Contains 1 entry' : `Contains ${count} entries`;
  });

  readonly visibleRules = computed(() => this.definitions().slice(0, MAX_CARD_RULES));

  readonly hiddenRuleCount = computed(() => Math.max(0, this.definitionCount() - this.visibleRules().length));

  readonly moreLabel = computed(() => {
    const hidden = this.hiddenRuleCount();
    return hidden === 1 ? '1 more entry' : `${hidden} more entries`;
  });

  onOpen(): void {
    this.open.emit(this.rule());
  }
}
