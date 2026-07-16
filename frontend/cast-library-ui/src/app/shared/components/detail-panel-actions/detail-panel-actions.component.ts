import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-detail-panel-actions',
  standalone: true,
  imports: [],
  templateUrl: './detail-panel-actions.component.html',
  styleUrl: './detail-panel-actions.component.scss',
})
export class DetailPanelActionsComponent {
  isDm    = input.required<boolean>();
  editing = input.required<boolean>();
  editBtnBorderColor = input<string>('');

  startEditingClick  = output<void>();
  saveDetailsClick   = output<void>();
  saveToLibraryClick = output<void>();
  cancelEditingClick = output<void>();
}
