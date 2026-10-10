import { Component, ChangeDetectionStrategy, DestroyRef, OnInit, inject, input } from '@angular/core';
import { GridArea, V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { V2GridAreaMarkService } from '../../../../../core/v2-grid-area-mark.service';

/**
 * cc-v2-placeholder
 *
 * What stands in a grid area that has nothing standing in it yet — the bottom-right area, and the
 * bottom-middle one for a player where the storyline is the DM's own.
 *
 * A placeholder has no content of its own, and so nothing of its own to say about its area: it
 * reports the area loaded (there was nothing to wait for), and publishes the area's mark — the lines
 * it was handed for the heading, and no icon, because there is nothing standing behind the area for
 * a mark to point at (see V2GridAreaMarkService).
 */
@Component({
  selector: 'cc-v2-placeholder',
  standalone: true,
  template: `
    <div class="v2-placeholder">
      <p class="area-name">{{ areaName() }}</p>
      <p>V2 Campaign Shell - Middle Middle</p>
      <p>Black background with pulsing border active</p>
    </div>
  `,
  /** OnPush: a placeholder has nothing but its inputs to draw, and they never change. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cc-v2-placeholder.component.scss'
})
export class CcV2PlaceholderComponent implements OnInit {
  areaName = input.required<string>();

  /**
   * The area of the campaign grid this placeholder stands in. A placeholder has nothing
   * to load, so it reports its area loaded as soon as it is up — which is also what the
   * storyline's own area relies on when the viewer is a player rather than the DM.
   */
  gridArea = input.required<GridArea>();

  /**
   * What the area's heading is to say while this placeholder stands in it. A placeholder has no
   * words of its own — it stands for content that is not there — so the shell that placed it hands
   * it the lines, and they are published as the area's mark below. Left empty, the area goes without
   * a heading.
   */
  title = input<readonly string[]>([]);

  private gridLoad = inject(V2GridLoadService);
  private marks = inject(V2GridAreaMarkService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.gridLoad.report(this.gridArea(), 'content');

    // The area is in hand only now, as an input, so the claim on its mark is made here by hand rather
    // than as the component is built — unlike the panels that know their area up front (see
    // publishGridAreaMark, which does both for them).
    const area = this.gridArea();
    this.marks.report(area, 'content', { title: () => this.title(), icon: null });
    this.destroyRef.onDestroy(() => this.marks.release(area, 'content'));
  }
}
