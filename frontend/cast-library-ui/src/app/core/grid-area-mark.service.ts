import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { GridArea } from './campaign-grid-load.service';

export interface GridAreaIcon {
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface GridAreaMark {
  readonly title: () => readonly string[];
  readonly icon: GridAreaIcon | null;
}

@Injectable({ providedIn: 'root' })
export class GridAreaMarkService {
  private readonly claims = signal<ReadonlyMap<GridArea, ReadonlyMap<string, GridAreaMark>>>(new Map());

  readonly marks = computed<ReadonlyMap<GridArea, GridAreaMark>>(() => {
    const marks = new Map<GridArea, GridAreaMark>();

    for (const [area, claims] of this.claims()) {
      const [firstMark] = claims.values();
      if (firstMark) marks.set(area, firstMark);
    }

    return marks;
  });

  mark(area: GridArea): GridAreaMark | null {
    return this.marks().get(area) ?? null;
  }

  report(area: GridArea, piece: string, mark: GridAreaMark): void {
    const next = new Map(this.claims());
    next.set(area, new Map(next.get(area)).set(piece, mark));
    this.claims.set(next);
  }

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

export interface GridAreaMarkClaim {
  readonly area: GridArea;
  readonly piece: string;
  release(): void;
}

export function publishGridAreaMark(area: GridArea, piece: string, mark: GridAreaMark): GridAreaMarkClaim {
  const marks = inject(GridAreaMarkService);

  const claim: GridAreaMarkClaim = {
    area,
    piece,
    release: () => marks.release(area, piece),
  };

  inject(DestroyRef).onDestroy(claim.release);
  marks.report(area, piece, mark);

  return claim;
}
