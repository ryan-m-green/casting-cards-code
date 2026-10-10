import { Injectable, signal } from '@angular/core';
import { GridArea } from './v2-grid-load.service';

/**
 * V2AreaChangeService
 *
 * The campaign grid's "something changed" notice-board: it remembers which grid areas
 * have had their content change since the viewer last looked at them. The radial
 * navigator listens here to light up the button that belongs to a changed area, while
 * the content that changed (a faction unlocked, a note written, ...) raises the notice
 * without knowing anything about the navigator that will draw it.
 *
 * A flag lives until the viewer goes to the area — the shell clears it when the area
 * becomes the current one — so a changed button keeps glowing until it has been seen.
 *
 * A notice raised for the area the viewer is *already* standing on is the one exception: the
 * change is right there in front of them, so the button is only a nudge rather than a signpost,
 * and it stops glowing on its own after `STANDING_MS` instead of waiting to be walked to (see
 * `standing`, which the shell keeps up to date).
 */
@Injectable({ providedIn: 'root' })
export class V2AreaChangeService {
  /** How long a notice lasts when it is raised for the area the viewer is standing on (ms). */
  private static readonly STANDING_MS = 6000;

  /** The areas currently flagged as changed. */
  readonly changedAreas = signal<ReadonlySet<GridArea>>(new Set());

  /** The area the viewer is standing on, as the shell last reported it. */
  private readonly standingArea = signal<GridArea | null>(null);

  /** The timed notices, by area, so one can be called off when its area is seen or re-flagged. */
  private readonly timers = new Map<GridArea, ReturnType<typeof setTimeout>>();

  /**
   * The shell says which area the viewer is standing on, whenever that moves. Landing on an area
   * that is already flagged counts the same as a notice raised there: it is in front of the viewer
   * now, so it is on its way out rather than waiting to be walked to.
   */
  standing(area: GridArea): void {
    this.standingArea.set(area);
    if (this.changedAreas().has(area)) this.startTimer(area);
  }

  /** Flag an area as changed: its content moved since it was last seen. */
  notify(area: GridArea): void {
    const current = this.changedAreas();
    if (current.has(area)) return;

    const next = new Set(current);
    next.add(area);
    this.changedAreas.set(next);

    // Raised for the area the viewer is standing on: not news they have to go and find.
    if (area === this.standingArea()) this.startTimer(area);
  }

  /** The viewer has looked at the area: its button can stop glowing. */
  clear(area: GridArea): void {
    this.callOff(area);

    const current = this.changedAreas();
    if (!current.has(area)) return;

    const next = new Set(current);
    next.delete(area);
    this.changedAreas.set(next);
  }

  /** Puts an area's notice on the clock, replacing any clock it was already on. */
  private startTimer(area: GridArea): void {
    this.callOff(area);

    this.timers.set(area, setTimeout(() => {
      this.timers.delete(area);
      this.clear(area);
    }, V2AreaChangeService.STANDING_MS));
  }

  /** Takes an area off the clock, if it was on it. */
  private callOff(area: GridArea): void {
    const running = this.timers.get(area);
    if (running === undefined) return;

    clearTimeout(running);
    this.timers.delete(area);
  }
}
