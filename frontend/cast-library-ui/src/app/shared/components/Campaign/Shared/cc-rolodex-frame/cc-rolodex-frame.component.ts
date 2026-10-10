import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type RolodexFrameSide = 'left' | 'right';

@Component({
  selector: 'cc-rolodex-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  styleUrl: './cc-rolodex-frame.component.scss',
  host: {
    'aria-hidden': 'true',
    '[class.rolodex-frame--right]': "side() === 'right'",
  },
})
export class CcRolodexFrameComponent {
  readonly side = input<RolodexFrameSide>('left');
}
