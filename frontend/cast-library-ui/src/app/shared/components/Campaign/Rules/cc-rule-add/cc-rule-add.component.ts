import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Rule } from '../../../../models/rule.model';
import { RuleLibraryService } from '../../../../../core/rule-library.service';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { CcRuleEditorComponent } from '../cc-rule-editor/cc-rule-editor.component';
import { CcRuleCardComponent } from '../cc-rule-card/cc-rule-card.component';

type AddTab = 'library' | 'new';

interface EntryKeywordChip {
  keyword: string;
  count: number;
  all: boolean;
}

@Component({
  selector: 'cc-rule-add',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, CcRuleEditorComponent, CcRuleCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-rule-add.component.html',
  styleUrl: './cc-rule-add.component.scss',
})
export class CcRuleAddComponent {
  private readonly library = inject(RuleLibraryService);

  readonly campaignId = input.required<string>();

  readonly portalColor = input<string>('#6e28d0');

  readonly saved = output<Rule>();

  readonly added = output<number>();

  readonly cancel = output<void>();

  readonly activeTab = signal<AddTab>('library');

  readonly picked = signal<readonly string[]>([]);

  readonly search = signal('');

  readonly linking = signal(false);

  readonly error = signal('');

  readonly available = computed(() => this.library.available(this.campaignId()));

  readonly loading = computed(() => this.library.isLoadingAvailable(this.campaignId()));

  readonly libraryEmpty = computed(() => this.available().length === 0);

  readonly candidates = computed<readonly Rule[]>(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) return this.available();

    return this.available().filter(entry => this.matches(entry, term));
  });

  readonly keywordChips = computed<EntryKeywordChip[]>(() => {
    const chips = new Map<string, { keyword: string; ids: string[] }>();

    for (const entry of this.available()) {
      for (const keyword of entry.keywords) {
        const key = keyword.trim();

        if (key === '') continue;

        const chip = chips.get(key.toLowerCase()) ?? { keyword: key, ids: [] };
        chip.ids.push(entry.id);
        chips.set(key.toLowerCase(), chip);
      }
    }

    return [...chips.values()]
      .map(chip => ({
        keyword: chip.keyword,
        count: chip.ids.length,
        all: chip.ids.every(id => this.picked().includes(id)),
      }))
      .sort((left, right) => left.keyword.localeCompare(right.keyword));
  });

  readonly pickedCount = computed(() => this.picked().length);

  readonly canAdd = computed(() => this.pickedCount() > 0 && !this.linking());

  constructor() {
    effect(() => {
      const campaignId = this.campaignId();
      untracked(() => {
        this.picked.set([]);
        this.error.set('');
        this.library.loadAvailable(campaignId).subscribe();
      });
    });
  }

  setTab(tab: AddTab): void {
    if (tab === this.activeTab()) return;

    this.activeTab.set(tab);
    this.error.set('');
  }

  isPicked(ruleId: string): boolean {
    return this.picked().includes(ruleId);
  }

  toggleRule(rule: Rule): void {
    this.picked.update(ids =>
      ids.includes(rule.id) ? ids.filter(id => id !== rule.id) : [...ids, rule.id]
    );
  }

  toggleKeyword(keyword: string): void {
    const ids = this.available()
      .filter(entry => entry.keywords.some(carried => carried.toLowerCase() === keyword.toLowerCase()))
      .map(entry => entry.id);

    if (ids.length === 0) return;

    const all = ids.every(id => this.isPicked(id));

    this.picked.update(picked =>
      all ? picked.filter(id => !ids.includes(id)) : [...new Set([...picked, ...ids])]
    );
  }

  onSearchChange(term: string): void {
    this.search.set(term);
  }

  clearPicked(): void {
    this.picked.set([]);
  }

  addPicked(): void {
    if (!this.canAdd()) return;

    this.linking.set(true);
    this.error.set('');

    this.library.link(this.campaignId(), this.picked()).subscribe({
      next: lifted => {
        this.linking.set(false);
        this.picked.set([]);
        this.added.emit(lifted.length);
      },
      error: () => {
        this.linking.set(false);
        this.error.set('Could not add those entries. Try again.');
      },
    });
  }

  onSaved(rule: Rule): void {
    this.saved.emit(rule);
  }

  private matches(entry: Rule, term: string): boolean {
    return (
      entry.name.toLowerCase().includes(term) ||
      entry.definition.toLowerCase().includes(term) ||
      entry.children.some(child =>
        child.name.toLowerCase().includes(term) || child.definition.toLowerCase().includes(term)
      ) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  }
}
