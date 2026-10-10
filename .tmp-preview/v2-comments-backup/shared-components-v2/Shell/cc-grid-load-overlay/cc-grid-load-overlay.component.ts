import { Component, ChangeDetectionStrategy, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';

/**
 * cc-grid-load-overlay
 *
 * The curtain over the campaign page while its grid is still filling in: black, over
 * everything but the portal's breathing border, which is the highest thing on the page.
 *
 * It is what makes the page's arrival invisible. The shell behind it does exactly what
 * it always did — the view opens on the middle of the grid and the nine areas read their
 * content — but none of that shows: the curtain lifts only once every area has reported
 * that its content is loaded (see V2GridLoadService) *and* the campaign is in hand, since
 * the whole page wears the campaign's colour. What the DM sees is the middle of the grid
 * fading up in its own colours, rather than its panels popping in one at a time in the
 * fallback purple.
 *
 * It carries a fail-safe: if an area never reports — a read that never settles, or a new
 * panel nobody taught to report — the curtain lifts anyway after a few seconds and says
 * which areas it was still waiting on, so a stuck curtain can never hold up the page.
 *
 * It also has a minimum: it stays up for at least half a second, so a page that loads
 * instantly fades in rather than blinking, and a fast refresh looks like the slow one.
 */
@Component({
  selector: 'cc-grid-load-overlay',
  standalone: true,
  template: `<!-- The curtain is this component's own host: see the styles for where it sits. -->`,
  /** OnPush: the curtain lifts on its own signals and timers, so only they redraw it. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cc-grid-load-overlay.component.scss',
  host: { '[class.is-lifting]': 'lifting()' }
})
export class CcGridLoadOverlayComponent implements OnDestroy {
  private readonly gridLoad = inject(V2GridLoadService);
  private readonly shell = inject(V2CampaignShellService);

  /** The least time the curtain stays up, however quickly the page comes together (ms). */
  private static readonly MINIMUM_MS = 500;

  /** How long the curtain waits before lifting regardless of what has reported. */
  private static readonly GIVE_UP_MS = 8000;

  /** The curtain is on its way out: fading, and out of the pointer's way. */
  readonly lifting = signal(false);

  /** The curtain has been up for its minimum: the page cannot have flickered past it. */
  private readonly minimumPassed = signal(false);

  /**
   * The page is fit to be seen, which takes both of these: the curtain has had its
   * minimum time up, and the grid is whole and dressed in its own colours — every area
   * has loaded its content, and the campaign is in hand. The campaign matters as much as
   * the areas: the whole page wears its colour (its border, the accents on its cards),
   * and until that colour arrives everything wears the fallback portal purple, so lifting
   * before it would show the page in the wrong colours and then watch them change.
   */
  private readonly ready = computed(() =>
    this.minimumPassed() && this.gridLoad.allLoaded() && !!this.shell.campaign()
  );

  private readonly minimumTimer = window.setTimeout(
    () => this.minimumPassed.set(true), CcGridLoadOverlayComponent.MINIMUM_MS);

  private readonly giveUpTimer = window.setTimeout(
    () => this.lift(true), CcGridLoadOverlayComponent.GIVE_UP_MS);

  constructor() {
    // Both conditions met: the curtain has been up its minimum, and the grid is whole and
    // wearing its own colours. Only then does it lift.
    effect(() => {
      if (this.ready()) this.lift(false);
    });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.minimumTimer);
    window.clearTimeout(this.giveUpTimer);
  }

  /** Fades the curtain out. `gaveUp` is the fail-safe picking up what never reported. */
  private lift(gaveUp: boolean): void {
    if (this.lifting()) return;

    if (gaveUp) {
      console.warn(
        'The grid curtain lifted with areas still loading its content:',
        this.gridLoad.pendingAreas()
      );
    }

    this.lifting.set(true);
  }
}
