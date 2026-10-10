import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CardSpotlightService {
  readonly spotlighted = signal<ReadonlySet<string>>(new Set());

  reveal(cardId: string): void {
    const current = this.spotlighted();
    if (current.has(cardId)) return;

    const next = new Set(current);
    next.add(cardId);
    this.spotlighted.set(next);
  }

  dismiss(cardId: string): void {
    const current = this.spotlighted();
    if (!current.has(cardId)) return;

    const next = new Set(current);
    next.delete(cardId);
    this.spotlighted.set(next);
  }
}
