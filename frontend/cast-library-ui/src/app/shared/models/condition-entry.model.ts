export interface ConditionEntry {
  readonly id: string;
  readonly name: string;
  readonly consequence: string;
  readonly keywords: readonly string[];
  /** The ring colour chosen for this condition, as #rrggbb; empty means the standard for its name. */
  readonly color: string;
}

export function emptyConditionEntry(id: string): ConditionEntry {
  return { id, name: '', consequence: '', keywords: [], color: '' };
}
