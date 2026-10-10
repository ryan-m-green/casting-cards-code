import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rule, RuleDefinition, emptyRuleDefinition, hasDefinition } from '../../../shared/models/rule.model';
import { RuleLibraryService } from '../../../core/rule-library.service';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { KeywordTagsComponent } from '../../../shared/components/Shared/cc-keyword-tags/cc-keyword-tags.component';

/**
 * The Cheat Sheet Library's create/edit page, written as a journal form the way the condition page
 * is: journal title, a "← Library" header, `fi` fields, and the save at the bottom-left.
 *
 * It carries the same fields as the campaign drawer's entry editor (`cc-rule-editor`) — name,
 * definition, hashtags, and the sub-entries an entry may hold — but writes to the DM's own library
 * (`campaign_rules`), so the entry belongs to them and can be added to any campaign's cheat sheet.
 */
@Component({
  selector: 'app-cheat-sheet-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, JournalTitleComponent, KeywordTagsComponent],
  templateUrl: './cheat-sheet-form.component.html',
  styleUrl: './cheat-sheet-form.component.scss',
})
export class CheatSheetFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly library = inject(RuleLibraryService);

  private readonly entryId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly editing = signal(false);
  readonly notFound = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly name = signal('');
  readonly definition = signal('');
  readonly children = signal<readonly RuleDefinition[]>([]);
  readonly keywords = signal<readonly string[]>([]);

  /** An entry that holds sub-entries is a group, so its own words read as a group's. */
  readonly grouped = computed(() => this.children().length > 0);
  readonly childCount = computed(() => this.children().length);

  readonly keywordOptions = computed<string[]>(() => {
    const used = new Set<string>();

    for (const entry of this.library.libraryRules()) {
      for (const keyword of entry.keywords) used.add(keyword);
    }

    return [...used].sort((left, right) => left.localeCompare(right));
  });

  readonly canSave = computed(
    () =>
      this.name().trim() !== '' &&
      this.children().every(child => !hasDefinition(child) || child.name.trim() !== '')
  );

  ngOnInit() {
    this.library.loadLibrary().subscribe(() => {
      if (!this.entryId) return;

      const entry = this.library.libraryRules().find(r => r.id === this.entryId);
      if (!entry) {
        this.notFound.set(true);
        return;
      }

      this.editing.set(true);
      this.name.set(entry.name);
      this.definition.set(entry.definition);
      this.children.set(entry.children.map(child => ({ ...child })));
      this.keywords.set([...entry.keywords]);
    });
  }

  addChild() {
    this.children.update(list => [...list, emptyRuleDefinition()]);
  }

  removeChild(index: number) {
    this.children.update(list => list.filter((_, position) => position !== index));
  }

  onChildName(index: number, value: string) {
    this.children.update(list =>
      list.map((child, position) => (position === index ? { ...child, name: value } : child))
    );
  }

  onChildDefinition(index: number, value: string) {
    this.children.update(list =>
      list.map((child, position) => (position === index ? { ...child, definition: value } : child))
    );
  }

  save() {
    if (!this.canSave() || this.saving() || this.notFound()) return;

    const draft: Rule = {
      id: this.entryId,
      name: this.name().trim(),
      definition: this.definition().trim(),
      children: this.children().filter(hasDefinition),
      keywords: [...this.keywords()],
    };

    this.saving.set(true);
    this.error.set('');

    const write = this.editing()
      ? this.library.updateInLibrary(draft)
      : this.library.createInLibrary(draft);

    write.subscribe({
      next: () => this.router.navigate(['/gm/cheat-sheets']),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the entry. Try again.');
      },
    });
  }

  remove() {
    if (!this.editing() || this.saving()) return;

    this.saving.set(true);
    this.error.set('');

    this.library.removeFromLibrary(this.entryId).subscribe({
      next: () => this.router.navigate(['/gm/cheat-sheets']),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not delete the entry. Try again.');
      },
    });
  }
}
