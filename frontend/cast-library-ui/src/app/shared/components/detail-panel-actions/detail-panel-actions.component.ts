import { Component, input, output } from '@angular/core';
import { FeatherIconComponent } from '../feather-icon/feather-icon.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-detail-panel-actions',
  standalone: true,
  imports: [FeatherIconComponent, IconComponent],
  templateUrl: './detail-panel-actions.component.html',
  styleUrl: './detail-panel-actions.component.scss',
})
export class DetailPanelActionsComponent {
  isDm    = input<boolean>(true);
  editing = input<boolean>(false);
  detailExpanded = input<boolean>(false);
  editBtnBorderColor = input<string>('');

  startEditingClick  = output<void>();
  saveDetailsClick   = output<void>();
  saveToLibraryClick = output<void>();
  cancelEditingClick = output<void>();
  closeClick         = output<void>();
}
