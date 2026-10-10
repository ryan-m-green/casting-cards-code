/**
 * The writes a campaign card's own event makes onto a list of cards.
 *
 * Every watcher of the campaign's card events holds its own copy of the cards it draws: the shell
 * holds the campaign (see `CampaignShellService`, which is the copy the rest of the page reads),
 * and a row holds the collections it was built from. Taking an event on means writing it into those
 * lists, and these are those writes — one card's lock, a ring of children's locks, the server's copy
 * of a card, a cast moved to another place.
 *
 * They all share two habits, and both matter on a phone: only the cards that change are copied, so a
 * row drawn with `track card.instanceId` keeps the DOM of every card that did not move; and a list
 * that has nothing to do is handed back *as it stands* — the same reference, which is no change to
 * the signal holding it, so nothing is rung and nothing is redrawn for an event that came to
 * nothing here. Watch out for the second when adding a write: return the list, never a copy of it.
 */

/**
 * One card's lock (or a whole ring of them, the caller naming which cards it is about), written onto
 * the list: the cards the caller names take the state, the rest are left as they stand.
 */
export function setCardsVisibility<T extends { isVisibleToPlayers: boolean }>(
  list: T[], belongs: (card: T) => boolean, isVisible: boolean): T[] {
  if (!list.some(card => belongs(card) && card.isVisibleToPlayers !== isVisible)) return list;

  return list.map(card => belongs(card) ? { ...card, isVisibleToPlayers: isVisible } : card);
}

/** The server's copy of one card, put in the place the list holds it. */
export function replaceCard<T>(list: T[], belongs: (card: T) => boolean, updated: T): T[] {
  const index = list.findIndex(belongs);
  if (index < 0) return list;

  const next = list.slice();
  next[index] = updated;
  return next;
}

/** A cast's place in the campaign, written where the list holds it. */
export function moveCastTo<
  T extends { sublocationInstanceId: string | null; locationInstanceId: string | null }
>(
  list: T[],
  belongs: (card: T) => boolean,
  sublocationInstanceId: string | null,
  locationInstanceId: string | null): T[] {
  const index = list.findIndex(belongs);

  // A card this list does not hold, or one already standing where it is going: handed back as it
  // stands, so no signal is rung for a move that comes to nothing.
  if (index < 0
    || (list[index].sublocationInstanceId === sublocationInstanceId
        && list[index].locationInstanceId === locationInstanceId)) return list;

  const next = list.slice();
  next[index] = { ...next[index], sublocationInstanceId, locationInstanceId };
  return next;
}
