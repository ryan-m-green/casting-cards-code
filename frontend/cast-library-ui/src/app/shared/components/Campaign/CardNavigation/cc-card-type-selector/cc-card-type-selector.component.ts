import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CcLocationIconComponent } from '../../../Shared/cc-location-icon/cc-location-icon.component';
import { CcSublocationIconComponent } from '../../../Shared/cc-sublocation-icon/cc-sublocation-icon.component';
import { CcCastIconComponent } from '../../../Shared/cc-cast-icon/cc-cast-icon.component';

export type CardType = 'locations' | 'sublocations' | 'casts';

@Component({
  selector: 'cc-card-type-selector',
  standalone: true,
  imports: [CcLocationIconComponent, CcSublocationIconComponent, CcCastIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-type-selector.component.html',
  styleUrl: './cc-card-type-selector.component.scss'
})
export class CcCardTypeSelectorComponent {
  @Input() active: CardType | null = null;

  @Output() toggle = new EventEmitter<CardType>();

  isOn(kind: CardType): boolean {
    return this.active === kind;
  }
}
