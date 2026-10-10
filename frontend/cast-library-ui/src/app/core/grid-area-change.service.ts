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

  notify(area: GridArea, targetUserId?: string | null): void {
    if (targetUserId) {
      if (targetUserId !== this.auth.currentUser()?.id) return;
    } else if (this.shellSvc.isDm()) {
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
