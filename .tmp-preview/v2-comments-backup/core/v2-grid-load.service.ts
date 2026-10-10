import { Injectable, computed, signal } from '@angular/core';

/** The nine areas of the campaign shell's grid, as the shell's own classes name them. */
export type GridArea =
  | 'top-left' | 'top-middle' | 'top-right'
  | 'middle-left' | 'middle-middle' | 'middle-right'
  | 'bottom-left' | 'bottom-middle' | 'bottom-right';

/**
 * What each area's content is made of: the pieces that have to report before the area
 * counts as loaded, and so before the curtain over the page can lift.
 *
 * Everything standing in an area reports the piece it is. Most areas hold a single
 * panel, so they wait for one report; the top middle holds two — the day counter and
 * the world map — and the middle right holds two as well — the soundtrack library and
 * the ambiances — so those areas wait for both. A panel added to an area has to be
 * given a piece here too, or the curtain would wait for something that never comes
 * (the overlay's own fail-safe is what lifts it in that case).
 */
const AREA_PIECES: Record<GridArea, readonly string[]> = {
  'top-left':      ['content'],                 // the quicknotes area
  'top-middle':    ['day', 'map'],              // the day counter, and the world map
  'top-right':     ['content'],                 // the party panel
  'middle-left':   ['content'],                 // the faction card navigation
  'middle-middle': ['content'],                 // the card navigation
  'middle-right':  ['soundtracks', 'ambiances'],// the soundtrack library, and the ambiances
  'bottom-left':   ['content'],                 // the encounter builder
  'bottom-middle': ['content'],                 // the storyline, or the placeholder
  'bottom-right':  ['content'],                 // the placeholder
};

/** Every area of the grid. */
export const GRID_AREAS = Object.keys(AREA_PIECES) as GridArea[];

/**
 * V2GridLoadService
 *
 * The campaign grid's load ledger, which is what the curtain over the page listens to.
 *
 * Every area's content reports the moment it is done loading — its first read has
 * landed (or failed) — and the ledger knows when the whole grid has: only then does
 * `allLoaded` come true and the curtain lift (see `cc-grid-load-overlay`). A report is
 * keyed by the area and by the piece of its content that made it, so an area holding
 * two panels waits for both, and a panel that reports again — a reload, say — does not
 * count twice.
 *
 * The ledger fills once per page load, which is what the curtain is for: a refresh is a
 * fresh ledger and a fresh curtain, while moving about inside the app leaves it full.
 */
@Injectable({ providedIn: 'root' })
export class V2GridLoadService {
  /** The pieces each area has reported, by area. */
  private readonly reported = signal<ReadonlyMap<GridArea, ReadonlySet<string>>>(new Map());

  /** Every piece of every area is in: the grid has finished loading its content. */
  readonly allLoaded = computed(() => GRID_AREAS.every(area => this.areaLoaded(area)));

  /** The areas still waiting on something — for the curtain's fail-safe to name. */
  readonly pendingAreas = computed(() => GRID_AREAS.filter(area => !this.areaLoaded(area)));

  /** One piece of an area's content is done: its first read has landed, or failed. */
  report(area: GridArea, piece: string): void {
    const reported = this.reported();
    const pieces = reported.get(area);
    if (pieces?.has(piece)) return;

    const next = new Map(reported);
    next.set(area, new Set(pieces).add(piece));
    this.reported.set(next);
  }

  /** An area is loaded once everything standing in it has reported. */
  private areaLoaded(area: GridArea): boolean {
    const pieces = this.reported().get(area);
    return !!pieces && AREA_PIECES[area].every(piece => pieces.has(piece));
  }
}
