import { Component, input, output, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { CcEditButtonComponent } from '../cc-edit-button/cc-edit-button.component';

@Component({
  selector: 'cc-detail-panel-actions',
  standalone: true,
  imports: [IconComponent, CcEditButtonComponent],
  templateUrl: './cc-detail-panel-actions.component.html',
  styleUrl: './cc-detail-panel-actions.component.scss',
})
export class CcDetailPanelActionsComponent {
  isDm    = input<boolean>(true);
  editing = input<boolean>(false);
  detailExpanded = input<boolean>(false);

  saveMenuOpen = signal(false);

  startEditingClick  = output<void>();
  saveDetailsClick   = output<void>();
  saveToLibraryClick = output<void>();
  cancelEditingClick = output<void>();
  closeClick         = output<void>();

  toggleSaveMenu(): void {
    this.saveMenuOpen.update(open => !open);
  }

  chooseSave(toLibrary: boolean): void {
    this.saveMenuOpen.set(false);
    if (toLibrary) {
      this.saveToLibraryClick.emit();
    } else {
      this.saveDetailsClick.emit();
    }
  }
}
