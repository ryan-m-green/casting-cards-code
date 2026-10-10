import { Injectable, signal } from '@angular/core';

/**
 * V2SpotlightService
 *
 * The campaign grid's "a card has just been revealed to you" notice-board: it remembers which
 * cards a spotlight should be standing over. A card that is unlocked for a player is put here,
 * and the spotlight that card carries (see cc-card-spotlight) draws itself over it until the
 * viewer clicks the light away.
 *
 * A card is taken out only when its own light has been clicked away, so a reveal that is still
 * unseen keeps being read back by the row it stands in (see cc-card-navigation): the card that
 * leads down to it shows the fairy alone, pointing the way, until the reveal has been seen.
 *
 * It is the card-level companion to V2AreaChangeService: the area's button says *where* to look,
 * and this says *what* to look at. The content that works the lock (see cc-card-navigation) is
 * the only one that puts a card here, and it does so for the players alone — the DM and the
 * Admin wrote the lock, so there is nothing for them to be shown.
 */
@Injectable({ providedIn: 'root' })
export class V2SpotlightService {
  /** The cards a spotlight is standing over, by instance id. */
  readonly spotlighted = signal<ReadonlySet<string>>(new Set());

  /** A card has been revealed: put a spotlight over it. */
  reveal(cardId: string): void {
    const current = this.spotlighted();
    if (current.has(cardId)) return;

    const next = new Set(current);
    next.add(cardId);
    this.spotlighted.set(next);
  }

  /** The viewer clicked the light away: take the spotlight off the card. */
  dismiss(cardId: string): void {
    const current = this.spotlighted();
    if (!current.has(cardId)) return;

    const next = new Set(current);
    next.delete(cardId);
    this.spotlighted.set(next);
  }
}
