import { Component, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatherIconComponent } from '../../feather-icon/feather-icon.component';
import { IconComponent } from '../../icon/icon.component';
import { CcPortraitInputComponent } from '../cc-portrait-input/cc-portrait-input.component';

@Component({
  selector: 'cc-detail-panel-actions',
  standalone: true,
  imports: [FeatherIconComponent, IconComponent, FormsModule, CcPortraitInputComponent],
  templateUrl: './cc-detail-panel-actions.component.html',
  styleUrl: './cc-detail-panel-actions.component.scss',
})
export class CcDetailPanelActionsComponent {
  isDm    = input<boolean>(true);
  editing = input<boolean>(false);
  detailExpanded = input<boolean>(false);
  editBtnBorderColor = input<string>('');
  portraitUrl        = input<string>('');
  portraitFile       = model<File | null>(null);
  portraitFileChange = output<File | null>();
  cardType           = input<'location' | 'sublocation' | 'cast' | 'faction'>('location');

  startEditingClick  = output<void>();
  saveDetailsClick   = output<void>();
  saveToLibraryClick = output<void>();
  cancelEditingClick = output<void>();
  closeClick         = output<void>();
}
