import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConditionEntry } from '../../../shared/models/condition-entry.model';
import { conditionRingColor } from '../../../shared/models/condition.model';
import { ConditionLibraryService } from '../../../core/condition-library.service';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { CcColorDropdownComponent } from '../../../shared/components/Shared/cc-color-dropdown/cc-color-dropdown.component';
import { KeywordTagsComponent } from '../../../shared/components/Shared/cc-keyword-tags/cc-keyword-tags.component';

/**
 * The Conditions Library's create/edit page, written as a journal form the way the cast card page
 * is: journal title, a "← Library" header, `fi` fields, and the save at the bottom-left.
 */
@Component({
  selector: 'app-condition-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, JournalTitleComponent, CcColorDropdownComponent, KeywordTagsComponent],
  templateUrl: './condition-form.component.html',
  styleUrl: './condition-form.component.scss',
})
export class ConditionFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly library = inject(ConditionLibraryService);
  private readonly fb = inject(FormBuilder);

  private readonly conditionId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly editing = signal(false);
  readonly notFound = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly keywords = signal<readonly string[]>([]);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    color: [''],
    consequence: [''],
  });

  /** True once the DM has picked a color, so typing a name stops steering it. */
  private colorPicked = false;

  readonly keywordOptions = computed<string[]>(() => {
    const used = new Set<string>();

    for (const entry of this.library.libraryConditions()) {
      for (const keyword of entry.keywords) used.add(keyword);
    }

    return [...used].sort((left, right) => left.localeCompare(right));
  });

  constructor() {
    // A chosen color takes over; until then the color follows the condition's name, so a standard
    // condition keeps the color it has always worn.
    this.form.controls.color.valueChanges.subscribe(() => { this.colorPicked = true; });

    this.form.controls.name.valueChanges.subscribe(name => {
      if (this.colorPicked) return;
      this.form.controls.color.setValue(conditionRingColor(name ?? ''), { emitEvent: false });
    });
  }

  ngOnInit() {
    this.library.loadLibrary().subscribe(() => {
      if (!this.conditionId) return;

      const entry = this.library.libraryConditions().find(c => c.id === this.conditionId);
      if (!entry) {
        this.notFound.set(true);
        return;
      }

      this.editing.set(true);
      this.form.setValue({
        name: entry.name,
        color: entry.color || conditionRingColor(entry.name),
        consequence: entry.consequence,
      }, { emitEvent: false });
      this.keywords.set([...entry.keywords]);
      this.colorPicked = !!entry.color;
    });
  }

  save() {
    if (this.form.invalid || this.saving() || this.notFound()) return;

    const value = this.form.value;

    const draft: ConditionEntry = {
      id: this.conditionId,
      name: (value.name ?? '').trim(),
      consequence: value.consequence ?? '',
      keywords: [...this.keywords()],
      color: value.color ?? '',
    };

    this.saving.set(true);
    this.error.set('');

    const write = this.editing()
      ? this.library.updateInLibrary(draft)
      : this.library.createInLibrary(draft);

    write.subscribe({
      next: () => this.router.navigate(['/gm/conditions']),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the condition. Try again.');
      },
    });
  }
}