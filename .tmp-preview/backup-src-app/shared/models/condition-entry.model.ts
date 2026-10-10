export interface ConditionEntry {
  readonly id: string;
  readonly name: string;
  readonly consequence: string;
  readonly keywords: readonly string[];
}

export function emptyConditionEntry(id: string): ConditionEntry {
  return { id, name: '', consequence: '', keywords: [] };
}
