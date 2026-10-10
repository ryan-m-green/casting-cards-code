import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { newGuid } from '../../../../models/rule.model';
import { ConditionLibraryService } from '../../../../../core/condition-library.service';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { KeywordTagsComponent } from '../../Shared/cc-keyword-tags/cc-keyword-tags.component';

@Component({
  selector: 'cc-condition-form',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, KeywordTagsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-condition-form.component.html',
  styleUrl: './cc-condition-form.component.scss',
})
export class CcConditionFormComponent {
  private readonly library = inject(ConditionLibraryService);

  readonly campaignId = input.required<string>();

  readonly cancelLabel = input('Cancel');

  readonly saved = output<ConditionEntry>();

  readonly cancel = output<void>();

  readonly name = signal('');

  readonly consequence = signal('');

  readonly keywords = signal<readonly string[]>([]);

  readonly saving = signal(false);

  readonly error = signal('');

  readonly keywordOptions = computed<string[]>(() => {
    const used = new Set<string>();

    for (const entry of this.library.conditions(this.campaignId())) {
      for (const keyword of entry.keywords) used.add(keyword);
    }

    return [...used].sort((left, right) => left.localeCompare(right));
  });

  readonly canSave = computed(() => this.name().trim() !== '');

  save(): void {
    if (!this.canSave() || this.saving()) return;

    const draft: ConditionEntry = {
      id: newGuid(),
      name: this.name().trim(),
      consequence: this.consequence().trim(),
      keywords: [...this.keywords()],
    };

    this.saving.set(true);
    this.error.set('');

    this.library.create(this.campaignId(), draft).subscribe({
      next: saved => {
        this.saving.set(false);
        this.name.set('');
        this.consequence.set('');
        this.keywords.set([]);
        this.saved.emit(saved);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the condition. Try again.');
      },
    });
  }
}
