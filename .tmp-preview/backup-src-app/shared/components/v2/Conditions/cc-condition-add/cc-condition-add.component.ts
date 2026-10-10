import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { conditionRingColor } from '../../../../models/condition.model';
import { ConditionLibraryService } from '../../../../../core/condition-library.service';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcConditionFormComponent } from '../cc-condition-form/cc-condition-form.component';

type AddTab = 'library' | 'new';

interface EntryKeywordChip {
  keyword: string;
  count: number;
  all: boolean;
}

@Component({
  selector: 'cc-condition-add',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, CcConditionFormComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-condition-add.component.html',
  styleUrl: './cc-condition-add.component.scss',
})
export class CcConditionAddComponent {
  private readonly library = inject(ConditionLibraryService);

  readonly campaignId = input.required<string>();

  readonly portalColor = input<string>('#6e28d0');

  readonly saved = output<ConditionEntry>();

  readonly added = output<number>();

  readonly cancel = output<void>();

  readonly activeTab = signal<AddTab>('library');

  readonly picked = signal<readonly string[]>([]);

  readonly search = signal('');

  readonly linking = signal(false);

  readonly error = signal('');

  readonly removingId = signal('');

  readonly available = computed(() => this.library.available(this.campaignId()));

  readonly linked = computed(() => this.library.conditions(this.campaignId()));

  readonly libraryEntries = computed<readonly ConditionEntry[]>(() => [
    ...this.linked(),
    ...this.available(),
  ]);

  readonly loading = computed(() =>
    this.library.isLoadingAvailable(this.campaignId()) || this.library.isLoading(this.campaignId()));

  readonly failed = computed(() => this.library.hasFailed(this.campaignId()));

  readonly libraryEmpty = computed(() => this.libraryEntries().length === 0);

  readonly candidates = computed<readonly ConditionEntry[]>(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) return this.libraryEntries();

    return this.libraryEntries().filter(entry => this.matches(entry, term));
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
        this.library.load(campaignId).subscribe();
        this.library.loadAvailable(campaignId).subscribe();
      });
    });
  }

  setTab(tab: AddTab): void {
    if (tab === this.activeTab()) return;

    this.activeTab.set(tab);
    this.error.set('');
  }

  isPicked(conditionId: string): boolean {
    return this.picked().includes(conditionId);
  }

  isLinked(conditionId: string): boolean {
    return this.linked().some(entry => entry.id === conditionId);
  }

  ringColor(name: string): string {
    return conditionRingColor(name);
  }

  toggleEntry(entry: ConditionEntry): void {
    if (this.isLinked(entry.id)) return;

    this.picked.update(ids =>
      ids.includes(entry.id) ? ids.filter(id => id !== entry.id) : [...ids, entry.id]
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
        this.error.set('Could not add those conditions. Try again.');
      },
    });
  }

  removeEntry(entry: ConditionEntry): void {
    if (this.removingId()) return;

    this.error.set('');
    this.removingId.set(entry.id);

    this.library.remove(this.campaignId(), entry.id).subscribe({
      next: () => {
        this.removingId.set('');
        this.picked.update(ids => ids.filter(id => id !== entry.id));
      },
      error: () => {
        this.removingId.set('');
        this.error.set('Could not delete that condition. Try again.');
      },
    });
  }

  onSaved(entry: ConditionEntry): void {
    this.activeTab.set('library');
    this.saved.emit(entry);
  }

  private matches(entry: ConditionEntry, term: string): boolean {
    return (
      entry.name.toLowerCase().includes(term) ||
      entry.consequence.toLowerCase().includes(term) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  }
}
