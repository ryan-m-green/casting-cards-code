import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { conditionRingColorOf } from '../../../../models/condition.model';
import { ConditionLibraryService } from '../../../../../core/condition-library.service';
import { CcConditionFormComponent } from '../cc-condition-form/cc-condition-form.component';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../../Shared/cc-delete-button/cc-delete-button.component';

@Component({
  selector: 'cc-condition-detail',
  standalone: true,
  imports: [CcConditionFormComponent, CcEditButtonComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-condition-detail.component.html',
  styleUrl: './cc-condition-detail.component.scss',
})
export class CcConditionDetailComponent {
  private readonly library = inject(ConditionLibraryService);

  readonly campaignId = input.required<string>();

  readonly conditionId = input.required<string>();

  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  /**
   * The condition handed to the form. Holding it here — rather than deriving it from the shelf while
   * the form is open — keeps the form's input still while it saves: the save writes the shelf, which
   * would otherwise re-evaluate the seed mid-submit. Null means the read view.
   */
  readonly editingSeed = signal<ConditionEntry | null>(null);

  readonly removing = signal(false);

  readonly error = signal('');

  readonly condition = computed(() => this.library.byId(this.campaignId(), this.conditionId()));

  readonly ringColor = computed(() => conditionRingColorOf(this.condition()?.name ?? '', this.condition()?.color));

  constructor() {
    effect(() => {
      this.conditionId();
      const campaignId = this.campaignId();

      untracked(() => {
        this.editingSeed.set(null);
        this.removing.set(false);
        this.error.set('');
        this.library.load(campaignId).subscribe();
      });
    });
  }

  startEditing(): void {
    const condition = this.condition();
    if (!condition) return;

    this.error.set('');
    this.editingSeed.set({ ...condition });
  }

  cancelEditing(): void {
    this.editingSeed.set(null);
    this.error.set('');
  }

  onSaved(): void {
    this.editingSeed.set(null);
  }

  remove(): void {
    const condition = this.condition();
    if (!condition || this.removing()) return;

    this.error.set('');
    this.removing.set(true);

    this.library.remove(this.campaignId(), condition.id).subscribe({
      next: () => {
        this.removing.set(false);
        this.closeDrawer.emit();
      },
      error: () => {
        this.removing.set(false);
        this.error.set('Could not remove the condition. Try again.');
      },
    });
  }
}
