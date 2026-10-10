import { Injectable, computed, signal } from '@angular/core';

export type GridArea =
  | 'top-left' | 'top-middle' | 'top-right'
  | 'middle-left' | 'middle-middle' | 'middle-right'
  | 'bottom-left' | 'bottom-middle' | 'bottom-right';

const AREA_PIECES: Record<GridArea, readonly string[]> = {
  'top-left':      ['content'],
  'top-middle':    ['day', 'map'],
  'top-right':     ['content'],
  'middle-left':   ['content'],
  'middle-middle': ['content'],
  'middle-right':  ['soundtracks', 'ambiances'],
  'bottom-left':   ['content'],
  'bottom-middle': ['content'],
  'bottom-right':  ['content'],
};

export const GRID_AREAS = Object.keys(AREA_PIECES) as GridArea[];

@Injectable({ providedIn: 'root' })
export class CampaignGridLoadService {
  private readonly reported = signal<ReadonlyMap<GridArea, ReadonlySet<string>>>(new Map());

  readonly allLoaded = computed(() => GRID_AREAS.every(area => this.areaLoaded(area)));

  readonly pendingAreas = computed(() => GRID_AREAS.filter(area => !this.areaLoaded(area)));

  report(area: GridArea, piece: string): void {
    const reported = this.reported();
    const pieces = reported.get(area);
    if (pieces?.has(piece)) return;

    const next = new Map(reported);
    next.set(area, new Set(pieces).add(piece));
    this.reported.set(next);
  }

  private areaLoaded(area: GridArea): boolean {
    const pieces = this.reported().get(area);
    return !!pieces && AREA_PIECES[area].every(piece => pieces.has(piece));
  }
}
