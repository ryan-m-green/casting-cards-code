import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../../../../core/auth/auth.service';
import { GridArea } from '../../../../../core/campaign-grid-load.service';
import { GridAreaMarkService } from '../../../../../core/grid-area-mark.service';

@Component({
  selector: 'cc-grid-area-title',
  standalone: true,
  templateUrl: './cc-grid-area-title.component.html',
  styleUrl: './cc-grid-area-title.component.scss',
})
export class CcGridAreaTitleComponent {
  private auth = inject(AuthService);
  private marks = inject(GridAreaMarkService);

  readonly gridArea = input.required<GridArea>();

  readonly action = input<string>('');

  readonly actionClick = output<void>();

  private readonly mark = computed(() => this.marks.mark(this.gridArea()));

  readonly title = computed<readonly string[]>(() => this.mark()?.title() ?? []);

  readonly icon = computed<string>(() => this.mark()?.icon?.path ?? '');

  readonly canAct = computed(() => this.action() !== '' && this.auth.isAdmin());

  onActionClick(event: MouseEvent): void {
    event.stopPropagation();
    this.actionClick.emit();
  }
}
