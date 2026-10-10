import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConditionEntry } from '../../../shared/models/condition-entry.model';
import { CONDITION_COLOR_CHOICES, conditionRingColor } from '../../../shared/models/condition.model';
import { ConditionLibraryService } from '../../../core/condition-library.service';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { JournalDropdownComponent } from '../../../shared/components/Shared/journal-dropdown/journal-dropdown.component';
import { KeywordTagsComponent } from '../../../shared/components/Shared/cc-keyword-tags/cc-keyword-tags.component';

/**
 * The Conditions Library's create/edit page, written as a journal form the way the cast card page
 * is: journal title, a "← Library" header, `fi` fields, and the save at the bottom-left.
 */
@Component({
  selector: 'app-condition-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, JournalTitleComponent, JournalDropdownComponent, KeywordTagsComponent],
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
    // `color` wears the chosen ring colour's name (the dropdown's own value); `save` turns it into its hex.
    color: [''],
    consequence: [''],
  });

  /** The colours the ring may wear, by name — the list the journal dropdown offers. */
  readonly colorOptions = CONDITION_COLOR_CHOICES.map(choice => choice.name);

  /** The block each colour wears, so the dropdown can show its options as colours. */
  readonly colorSwatches: Record<string, string> = Object.fromEntries(
    CONDITION_COLOR_CHOICES.map(choice => [choice.name, choice.hex] as const)
  );

  /** The colour control, bound straight to the journal dropdown so only a picked colour can land. */
  get colorControl() { return this.form.get('color') as FormControl; }

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
      // The control wears the colour's name (the dropdown's own value); `save` turns it into its hex.
      this.form.controls.color.setValue(this.colorNameOf(conditionRingColor(name ?? '')), { emitEvent: false });
    });
  }

  /** The colour-choice name a hex belongs to, or '' when the list holds no such colour. */
  private colorNameOf(hex: string): string {
    const wanted = (hex ?? '').trim().toLowerCase();
    return CONDITION_COLOR_CHOICES.find(choice => choice.hex.toLowerCase() === wanted)?.name ?? '';
  }

  /** The hex of the named colour choice, or '' when the list holds no such name. */
  private colorHexOf(name: string): string {
    return CONDITION_COLOR_CHOICES.find(choice => choice.name === name)?.hex ?? '';
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
        color: this.colorNameOf(entry.color || conditionRingColor(entry.name)),
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
      color: this.colorHexOf(value.color ?? ''),
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