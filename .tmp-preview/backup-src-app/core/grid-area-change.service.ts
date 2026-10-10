import { Injectable, inject, signal } from '@angular/core';
import { GridArea } from './campaign-grid-load.service';
import { AuthService } from './auth/auth.service';
import { CampaignShellService } from './campaign-shell.service';

@Injectable({ providedIn: 'root' })
export class GridAreaChangeService {
  private static readonly STANDING_MS = 6000;

  private readonly auth = inject(AuthService);
  private readonly shellSvc = inject(CampaignShellService);

  readonly changedAreas = signal<ReadonlySet<GridArea>>(new Set());

  private readonly standingArea = signal<GridArea | null>(null);

  private readonly timers = new Map<GridArea, ReturnType<typeof setTimeout>>();

  standing(area: GridArea): void {
    this.standingArea.set(area);
    if (this.changedAreas().has(area)) this.startTimer(area);
  }

  /**
   * Flag an area as changed: its content moved since it was last seen.
   *
   * This is the one place that decides whether the notice is this viewer's to show. The rule has
   * two cases: a notice that names a user is theirs alone, whatever their role — every campaign
   * client hears it, and only the one it names lights its button; a notice with no user is for the
   * players at large, never the GM who authored the change. Whose player is read from the campaign
   * at hand and never from the global role: a DM sitting at another DM's table as a player is a
   * player there, and the notice is theirs (see the shell's `isPlayer`).
   */
  notify(area: GridArea, targetUserId?: string | null): void {
    if (targetUserId) {
      // Aimed at one user: theirs alone, whatever their role.
      if (targetUserId !== this.auth.currentUser()?.id) return;
    } else if (this.shellSvc.isDm()) {
      // Unaddressed: the players at large.
      return;
    }

    const current = this.changedAreas();
    if (current.has(area)) return;

    const next = new Set(current);
    next.add(area);
    this.changedAreas.set(next);

    if (area === this.standingArea()) this.startTimer(area);
  }

  clear(area: GridArea): void {
    this.callOff(area);

    const current = this.changedAreas();
    if (!current.has(area)) return;

    const next = new Set(current);
    next.delete(area);
    this.changedAreas.set(next);
  }

  private startTimer(area: GridArea): void {
    this.callOff(area);

    this.timers.set(area, setTimeout(() => {
      this.timers.delete(area);
      this.clear(area);
    }, GridAreaChangeService.STANDING_MS));
  }

  private callOff(area: GridArea): void {
    const running = this.timers.get(area);
    if (running === undefined) return;

    clearTimeout(running);
    this.timers.delete(area);
  }
}
