
export function setCardsVisibility<T extends { isVisibleToPlayers: boolean }>(
  list: T[], belongs: (card: T) => boolean, isVisible: boolean): T[] {
  if (!list.some(card => belongs(card) && card.isVisibleToPlayers !== isVisible)) return list;

  return list.map(card => belongs(card) ? { ...card, isVisibleToPlayers: isVisible } : card);
}

export function replaceCard<T>(list: T[], belongs: (card: T) => boolean, updated: T): T[] {
  const index = list.findIndex(belongs);
  if (index < 0) return list;

  const next = list.slice();
  next[index] = updated;
  return next;
}

export function moveCastTo<
  T extends { sublocationInstanceId: string | null; locationInstanceId: string | null }
>(
  list: T[],
  belongs: (card: T) => boolean,
  sublocationInstanceId: string | null,
  locationInstanceId: string | null): T[] {
  const index = list.findIndex(belongs);

  if (index < 0
    || (list[index].sublocationInstanceId === sublocationInstanceId
        && list[index].locationInstanceId === locationInstanceId)) return list;

  const next = list.slice();
  next[index] = { ...next[index], sublocationInstanceId, locationInstanceId };
  return next;
}
