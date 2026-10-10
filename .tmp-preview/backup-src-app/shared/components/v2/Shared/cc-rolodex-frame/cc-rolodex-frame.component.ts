import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Which end of a rolodex row a bar sits on. */
export type RolodexFrameSide = 'left' | 'right';

/**
 * One of the two fuzzy black bars that soften the ends of a rolodex row: 62px wide
 * and 15% in from the edge of the room, so a row fades out exactly where the deck's
 * cards fade out. The bars are decoration — they carry no content and take no
 * pointer events — and they are caught by hand rather than drawn, so this is the one
 * place their spacing is written.
 *
 * A bar is placed against the room it sits in, not against the row it covers: put it
 * where the room is the nearest positioned ancestor, and left/right mean the room's
 * own 15% marks.
 */
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
