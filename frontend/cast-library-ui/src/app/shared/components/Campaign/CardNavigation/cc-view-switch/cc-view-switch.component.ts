import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CcGmIconComponent } from '../../../Shared/cc-gm-icon/cc-gm-icon.component';
import { CcPlayerIconComponent } from '../../Shared/cc-player-icon/cc-player-icon.component';

export type ViewMode = 'gm' | 'party';

@Component({
  selector: 'cc-view-switch',
  standalone: true,
  imports: [CcGmIconComponent, CcPlayerIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-view-switch.component.html',
  styleUrl: './cc-view-switch.component.scss'
})
export class CcViewSwitchComponent {
  @Input() mode: ViewMode = 'gm';

  @Output() modeChange = new EventEmitter<ViewMode>();

  isOn(mode: ViewMode): boolean {
    return this.mode === mode;
  }

  select(mode: ViewMode): void {
    if (mode !== this.mode) this.modeChange.emit(mode);
  }
}
