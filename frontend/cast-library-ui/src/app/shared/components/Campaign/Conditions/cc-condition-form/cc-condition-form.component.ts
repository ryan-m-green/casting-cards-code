import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { conditionRingColor } from '../../../../models/condition.model';
import { newGuid } from '../../../../models/rule.model';
import { ConditionLibraryService } from '../../../../../core/condition-library.service';
import { CcColorDropdownComponent } from '../../../Shared/cc-color-dropdown/cc-color-dropdown.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { KeywordTagsComponent } from '../../../Shared/cc-keyword-tags/cc-keyword-tags.component';

@Component({
  selector: 'cc-condition-form',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, KeywordTagsComponent, CcColorDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-condition-form.component.html',
  styleUrl: './cc-condition-form.component.scss',
})
export class CcConditionFormComponent {
  private readonly library = inject(ConditionLibraryService);

  /** Which shelf the form writes to: a campaign's conditions, or the GM's whole library. */
  readonly mode = input<'campaign' | 'library'>('campaign');

  /** The campaign the condition belongs to; unused in `library` mode. */
  readonly campaignId = input<string>('');

  readonly condition = input<ConditionEntry | null>(null);

  readonly cancelLabel = input('Cancel');

  readonly saved = output<ConditionEntry>();

  readonly cancel = output<void>();

  readonly name = signal('');

  readonly consequence = signal('');

  readonly keywords = signal<readonly string[]>([]);

  /** The ring colour chosen for the condition, as #rrggbb. */
  readonly color = signal('');

  /** True once the DM has picked a colour, so typing a name stops steering it. */
  private colorPicked = false;

  readonly saving = signal(false);

  readonly error = signal('');

  readonly keywordOptions = computed<string[]>(() => {
    const used = new Set<string>();

    const entries = this.mode() === 'library'
      ? this.library.libraryConditions()
      : this.library.conditions(this.campaignId());

    for (const entry of entries) {
      for (const keyword of entry.keywords) used.add(keyword);
    }

    return [...used].sort((left, right) => left.localeCompare(right));
  });

  readonly canSave = computed(() => this.name().trim() !== '');

  constructor() {
    effect(() => {
      const condition = this.condition();
      untracked(() => this.seedFrom(condition));
    });
  }

  onName(value: string): void {
    this.name.set(value);

    // Until the DM picks one, the colour follows the name, so a standard condition keeps the colour
    // it has always worn.
    if (!this.colorPicked) this.color.set(conditionRingColor(value));
  }

  onColor(value: string): void {
    this.colorPicked = true;
    this.color.set(value);
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;

    const seed = this.condition();

    const draft: ConditionEntry = {
      id: seed?.id ?? newGuid(),
      name: this.name().trim(),
      consequence: this.consequence().trim(),
      keywords: [...this.keywords()],
      color: this.color(),
    };

    this.saving.set(true);
    this.error.set('');

    const write = this.mode() === 'library'
      ? (seed ? this.library.updateInLibrary(draft) : this.library.createInLibrary(draft))
      : (seed ? this.library.update(this.campaignId(), draft) : this.library.create(this.campaignId(), draft));

    write.subscribe({
      next: saved => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the condition. Try again.');
      },
    });
  }

  private seedFrom(condition: ConditionEntry | null): void {
    this.name.set(condition?.name ?? '');
    this.consequence.set(condition?.consequence ?? '');
    this.keywords.set([...(condition?.keywords ?? [])]);
    this.color.set(condition?.color || conditionRingColor(condition?.name ?? ''));
    this.colorPicked = !!condition?.color;
    this.saving.set(false);
    this.error.set('');
  }
}
