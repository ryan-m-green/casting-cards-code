import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../../../../core/auth/auth.service';
import { GridArea } from '../../../../../core/v2-grid-load.service';
import { V2GridAreaMarkService } from '../../../../../core/v2-grid-area-mark.service';

/**
 * A grid area's own title: the heading over one of the campaign board's nine areas, with that
 * area's icon beside it.
 *
 * Neither the words nor the icon are the heading's own: both belong to whatever stands in the area,
 * which publishes the two of them as the area's mark (see V2GridAreaMarkService). So a panel a
 * viewer's role keeps off the board — the soundtracks library, the storyline — leaves the heading
 * bare along with its button on the radial navigator, and a component put into an area names that
 * area without the shell's own markup being touched.
 *
 * The icon can be a button (`action`, `actionClick`): where a shell passes an action, the icon
 * becomes the way into whatever that area keeps behind it. That button is the Admin's own and is
 * drawn for that role alone — what stands behind these icons is a window on the campaign's traffic
 * rather than part of the board — so any other viewer keeps the plain icon.
 */
@Component({
  selector: 'cc-grid-area-title',
  standalone: true,
  templateUrl: './cc-grid-area-title.component.html',
  styleUrl: './cc-grid-area-title.component.scss',
})
export class CcGridAreaTitleComponent {
  private auth = inject(AuthService);
  private marks = inject(V2GridAreaMarkService);

  /** The area this heading stands over. */
  readonly gridArea = input.required<GridArea>();

  /** What the icon's button says, in its tooltip and to a screen reader. '' leaves it an image. */
  readonly action = input<string>('');

  /** The icon's button was pressed. */
  readonly actionClick = output<void>();

  /** What the area's content published for it, or null where nothing has published for it. */
  private readonly mark = computed(() => this.marks.mark(this.gridArea()));

  /** The lines the heading is written in, read from the area's mark as the heading is drawn. */
  readonly title = computed<readonly string[]>(() => this.mark()?.title() ?? []);

  /** The svg the heading wears, or '' where the area has no mark of its own. */
  readonly icon = computed<string>(() => this.mark()?.icon?.path ?? '');

  /** Whether this viewer is handed the icon as a button: the Admin's own, and only with an action. */
  readonly canAct = computed(() => this.action() !== '' && this.auth.isAdmin());

  onActionClick(event: MouseEvent): void {
    event.stopPropagation();
    this.actionClick.emit();
  }
}
