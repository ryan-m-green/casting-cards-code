import { Component, input, output, signal } from '@angular/core';
import { FeatherIconComponent } from '../../feather-icon/feather-icon.component';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'cc-detail-panel-actions',
  standalone: true,
  imports: [FeatherIconComponent, IconComponent],
  templateUrl: './cc-detail-panel-actions.component.html',
  styleUrl: './cc-detail-panel-actions.component.scss',
})
export class CcDetailPanelActionsComponent {
  isDm    = input<boolean>(true);
  editing = input<boolean>(false);
  detailExpanded = input<boolean>(false);
  editBtnBorderColor = input<string>('');

  // Slide-out save menu (Campaign / Campaign + Library)
  saveMenuOpen = signal(false);

  startEditingClick  = output<void>();
  saveDetailsClick   = output<void>();
  saveToLibraryClick = output<void>();
  cancelEditingClick = output<void>();
  closeClick         = output<void>();

  toggleSaveMenu(): void {
    this.saveMenuOpen.update(open => !open);
  }

  /** `toLibrary` = false → Campaign only, true → Campaign + Library. */
  chooseSave(toLibrary: boolean): void {
    this.saveMenuOpen.set(false);
    if (toLibrary) {
      this.saveToLibraryClick.emit();
    } else {
      this.saveDetailsClick.emit();
    }
  }
}
