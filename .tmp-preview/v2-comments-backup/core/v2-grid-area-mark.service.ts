import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { GridArea } from './v2-grid-load.service';

/**
 * The icon one of the campaign grid's areas is known by: the SVG drawn for it, and the size the
 * radial navigator is asked to draw it at.
 *
 * The size is in the navigator's own user units — the space its paths are drawn in (see
 * cc-radial-nav) — where a button's face is about 82 units across, so an icon of some 32 to 44
 * units sits on it with room to spare. The heading over the area draws the same SVG at its own size,
 * which is the stylesheet's business (see cc-grid-area-title), so one icon serves both.
 */
export interface GridAreaIcon {
  /** Path to the SVG, as the area's own content names it (e.g. '/factions.svg'). */
  readonly path: string;
  /** How wide the icon is drawn on the radial button. */
  readonly width: number;
  /** How tall the icon is drawn on the radial button. */
  readonly height: number;
}

/**
 * What a grid area is known by, as the panel standing in it writes it: the lines its heading is
 * written in, and the icon it wears — on that heading, and on its button on the radial navigator.
 *
 * The lines are a function rather than a list so the heading is written afresh every time it is
 * drawn: an area over the campaign's own heart says 'The Realm of' and then the campaign's name,
 * which is in hand only once the shell has read it (see V2CampaignShellService), and a heading that
 * was written once as the panel was built would keep a blank there for good.
 */
export interface GridAreaMark {
  /** The lines the area's heading is written in, read whenever the heading is drawn. */
  readonly title: () => readonly string[];
  /** The SVG the area is known by, or null for an area with no mark of its own. */
  readonly icon: GridAreaIcon | null;
}

/**
 * V2GridAreaMarkService
 *
 * The campaign grid's mark ledger: what each area's content says its area is called, and what it is
 * drawn by.
 *
 * An area's heading and its button on the radial navigator both belong to the area, and what they
 * say belongs to whatever stands in it: every panel publishes its own mark as it is built (see
 * `publishGridAreaMark`), so placing a component in an area is all it takes for that area's heading
 * and button to take the component's own name and mark — and a component the viewer's role keeps off
 * the board publishes nothing, which leaves the heading and the button bare rather than pointing the
 * way to something that is not there.
 *
 * A publication is a claim keyed by the area and by the piece of content that made it — the same
 * names the load ledger knows an area's pieces by (see V2GridLoadService), so a panel says `day` or
 * `soundtracks` exactly as it reports its load. The first claim an area still holds is the one
 * drawn (the day counter's mark rather than the world map's beside it), and a claim is taken back
 * when the panel that made it goes, which leaves the area to the next panel standing there — or to
 * no mark at all.
 */
@Injectable({ providedIn: 'root' })
export class V2GridAreaMarkService {
  /** The claims each area holds, by area, in the order they were made. */
  private readonly claims = signal<ReadonlyMap<GridArea, ReadonlyMap<string, GridAreaMark>>>(new Map());

  /** What each area is known by: the first claim it still holds — nothing where it holds none. */
  readonly marks = computed<ReadonlyMap<GridArea, GridAreaMark>>(() => {
    const marks = new Map<GridArea, GridAreaMark>();

    for (const [area, claims] of this.claims()) {
      const [firstMark] = claims.values();
      if (firstMark) marks.set(area, firstMark);
    }

    return marks;
  });

  /** What one area is known by, or null where it holds no claim. */
  mark(area: GridArea): GridAreaMark | null {
    return this.marks().get(area) ?? null;
  }

  /** A piece of an area's content publishes the mark its area should wear. */
  report(area: GridArea, piece: string, mark: GridAreaMark): void {
    const next = new Map(this.claims());
    next.set(area, new Map(next.get(area)).set(piece, mark));
    this.claims.set(next);
  }

  /** The piece takes its mark back — the panel that published it is going. */
  release(area: GridArea, piece: string): void {
    const held = this.claims().get(area);
    if (!held?.has(piece)) return;

    const remaining = new Map(held);
    remaining.delete(piece);

    const next = new Map(this.claims());
    if (remaining.size) next.set(area, remaining);
    else next.delete(area);
    this.claims.set(next);
  }
}

/** One piece of content's claim on its area's mark: published, and given up on teardown. */
export interface GridAreaMarkClaim {
  /** The area the mark belongs to. */
  readonly area: GridArea;
  /** The piece of the area's content that published it. */
  readonly piece: string;
  /** Takes the mark back off the area. */
  release(): void;
}

/**
 * Publishes the mark of the grid area a component stands in, and holds the claim for as long as the
 * component stands there.
 *
 * Call it from the component's own field initializers or constructor — the places where Angular is
 * still building it, and so can hand it the claim's teardown. The mark comes off the area when the
 * component is destroyed, which leaves the area to the next panel standing there, or to none.
 *
 * Returns the claim, so a component can hold it (and give it up early, if it ever wants to).
 */
export function publishGridAreaMark(area: GridArea, piece: string, mark: GridAreaMark): GridAreaMarkClaim {
  const marks = inject(V2GridAreaMarkService);

  const claim: GridAreaMarkClaim = {
    area,
    piece,
    release: () => marks.release(area, piece),
  };

  inject(DestroyRef).onDestroy(claim.release);
  marks.report(area, piece, mark);

  return claim;
}
