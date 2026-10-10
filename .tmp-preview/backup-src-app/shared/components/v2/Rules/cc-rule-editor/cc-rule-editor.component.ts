import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Rule, RuleDefinition, emptyRuleDefinition, hasDefinition, newGuid } from '../../../../models/rule.model';
import { RuleLibraryService } from '../../../../../core/rule-library.service';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { KeywordTagsComponent } from '../../Shared/cc-keyword-tags/cc-keyword-tags.component';

@Component({
  selector: 'cc-rule-editor',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, KeywordTagsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-rule-editor.component.html',
  styleUrl: './cc-rule-editor.component.scss',
})
export class CcRuleEditorComponent {
  private readonly library = inject(RuleLibraryService);

  readonly campaignId = input.required<string>();

  readonly rule = input<Rule | null>(null);

  readonly cancelLabel = input('Cancel');

  readonly saved = output<Rule>();

  readonly cancel = output<void>();

  readonly name = signal('');

  readonly definition = signal('');

  readonly children = signal<readonly RuleDefinition[]>([]);

  readonly keywords = signal<readonly string[]>([]);

  readonly saving = signal(false);

  readonly error = signal('');

  readonly grouped = computed(() => this.children().length > 0);

  readonly childCount = computed(() => this.children().length);

  readonly keywordOptions = computed<string[]>(() => {
    const used = new Set<string>();

    for (const rule of this.library.rules(this.campaignId())) {
      for (const keyword of rule.keywords) used.add(keyword);
    }

    return [...used].sort((left, right) => left.localeCompare(right));
  });

  readonly canSave = computed(
    () =>
      this.name().trim() !== '' &&
      this.children().every(child => !hasDefinition(child) || child.name.trim() !== '')
  );

  constructor() {
    effect(() => {
      const rule = this.rule();
      untracked(() => this.seedFrom(rule));
    });
  }

  addChild(): void {
    this.children.update(list => [...list, emptyRuleDefinition()]);
  }

  removeChild(index: number): void {
    this.children.update(list => list.filter((_, position) => position !== index));
  }

  removeAllChildren(): void {
    this.children.set([]);
  }

  onChildName(index: number, value: string): void {
    this.children.update(list =>
      list.map((child, position) => (position === index ? { ...child, name: value } : child))
    );
  }

  onChildDefinition(index: number, value: string): void {
    this.children.update(list =>
      list.map((child, position) => (position === index ? { ...child, definition: value } : child))
    );
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;

    const seed = this.rule();

    const draft: Rule = {
      id: seed?.id ?? newGuid(),
      name: this.name().trim(),
      definition: this.definition().trim(),
      children: this.children().filter(hasDefinition),
      keywords: [...this.keywords()],
    };

    this.saving.set(true);
    this.error.set('');

    const request = seed
      ? this.library.update(this.campaignId(), draft)
      : this.library.create(this.campaignId(), draft);

    request.subscribe({
      next: saved => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the entry. Try again.');
      },
    });
  }

  private seedFrom(rule: Rule | null): void {
    this.name.set(rule?.name ?? '');
    this.definition.set(rule?.definition ?? '');
    this.children.set((rule?.children ?? []).map(child => ({ ...child })));
    this.keywords.set([...(rule?.keywords ?? [])]);
    this.saving.set(false);
    this.error.set('');
  }
}
