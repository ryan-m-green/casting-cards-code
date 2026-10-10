import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RuleLibraryService } from '../../../../../core/rule-library.service';
import { CcRuleEditorComponent } from '../cc-rule-editor/cc-rule-editor.component';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../../Shared/cc-delete-button/cc-delete-button.component';

@Component({
  selector: 'cc-rule-detail-content',
  standalone: true,
  imports: [CcRuleEditorComponent, CcEditButtonComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-rule-detail-content.component.html',
  styleUrl: './cc-rule-detail-content.component.scss',
})
export class CcRuleDetailContentComponent {
  private readonly library = inject(RuleLibraryService);

  readonly ruleId = input.required<string>();

  readonly campaignId = input.required<string>();

  readonly closeDrawer = output<void>();

  readonly editing = signal(false);

  readonly removing = signal(false);

  readonly error = signal('');

  readonly rule = computed(() => this.library.byId(this.campaignId(), this.ruleId()));

  readonly nested = computed(() => this.rule()?.children ?? []);

  readonly keywords = computed(() => this.rule()?.keywords ?? []);

  constructor() {
    effect(() => {
      this.ruleId();
      const campaignId = this.campaignId();

      untracked(() => {
        this.editing.set(false);
        this.removing.set(false);
        this.error.set('');
        this.library.load(campaignId);
      });
    });
  }

  startEditing(): void {
    this.error.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.error.set('');
  }

  onSaved(): void {
    this.editing.set(false);
  }

  remove(): void {
    const rule = this.rule();
    if (!rule || this.removing()) return;

    this.removing.set(true);

    this.library.remove(this.campaignId(), rule.id).subscribe({
      next: () => {
        this.removing.set(false);
        this.closeDrawer.emit();
      },
      error: () => {
        this.removing.set(false);
        this.error.set('Could not delete the entry. Try again.');
      },
    });
  }
}
